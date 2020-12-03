import { createAnonymousClient, createUser } from "./test-utils";
import { expect } from "chai";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import * as fs from "fs";
import request = require("superagent");
import {
    SetMyAvatarImageDocument,
    SetMyCoverImageDocument,
    DeleteMeDocument,
    CreatePackageDocument,
    SetPackageCoverImageDocument,
    DeletePackageDocument,
    CreateCollectionDocument,
    SetCollectionCoverImageDocument,
    DeleteCollectionDocument,
    SetCatalogCoverImageDocument,
    UpdateMeDocument
} from "./registry-client";
import * as crypto from "crypto";

describe("Image Upload Tests", async () => {
    const anonymousUser = createAnonymousClient();
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create user", async () => {
        userAClient = await createUser(
            "FirstUserName",
            "FirstUserLastName",
            "first-user-username",
            "first-user@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstUserName",
            "FirstUserLastName",
            "second-user-username",
            "second-user@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.exist;
    });

    it("setMyAvatarImage_WithValidImage_UploadsImageAndStoresMetadataInDbAndIsPublic", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        const uploadResult = await userAClient.mutate({
            mutation: SetMyAvatarImageDocument,
            variables: {
                image: { base64: imageContent }
            }
        });

        expect(uploadResult).to.exist;
        expect(uploadResult.errors).to.not.exist;
        expect(uploadResult.data).to.exist;

        const imageServingResult = await request.get("localhost:4000/images/user/first-user-username/avatar");

        expect(imageServingResult.status).equal(200);
    });

    it("Avatar image not found", async function () {
        let errorFound = false;
        try {
            const imageServingResult = await request.get("localhost:4000/images/user/invalid-username/avatar");
        } catch (err) {
            expect(err.message).to.equal("Not Found");
            errorFound = true;
        }

        expect(errorFound).to.be.true;

        const imageWithData = await request
            .get("http://localhost:4000/images/user/first-user-username/avatar")
            .buffer(true)
            .parse(request.parse.image);

        let hash = crypto.createHash("sha256").update(imageWithData.body, "utf8").digest("hex");
        expect(hash).equal("a847c9488f535513fa06cfab75989ae767cae7381ddab701d6927e2886c1982f");
    });

    it("Download user avatar image", async function () {
        const imageServingResult = await request.get("localhost:4000/images/user/first-user-username/avatar");

        expect(imageServingResult.body).to.exist;
        expect(imageServingResult.type).to.equal("image/jpeg");
    });

    it("setMyCoverImage_WithValidImage_UploadsImageAndStoresMetadataInDbAndIsPublic", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        const uploadResult = await userAClient.mutate({
            mutation: SetMyCoverImageDocument,
            variables: {
                image: { base64: imageContent }
            }
        });
        expect(uploadResult).to.exist;
        expect(uploadResult.errors).to.not.exist;
        expect(uploadResult.data).to.exist;

        const imageServingResult = await request.get("localhost:4000/images/user/first-user-username/cover");

        expect(imageServingResult.status).equal(200);
    });

    it("Download user cover image", async function () {
        let imageServingResult = await request.get("http://localhost:4000/images/user/first-user-username/cover");

        expect(imageServingResult.body).to.exist;
        expect(imageServingResult.type).to.equal("image/jpeg");

        const imageWithData = await request
            .get("http://localhost:4000/images/user/first-user-username/cover")
            .buffer(true)
            .parse(request.parse.image);

        let hash = crypto.createHash("sha256").update(imageWithData.body, "utf8").digest("hex");
        expect(hash).equal("6df1299de51ce7178d906575a6877a3d16d9e193bf382ec9f97bdd7654a661f7");
    });

    it("setMyAvatarImage_WithUnsupportedImageFormat_ReturnsErrorWithInvalidFormatErrorCode", async () => {
        const imageContent = "data:image/svg+xml;base64," + fs.readFileSync("test/other-files/ba.svg", "base64");

        const uploadResult = await userAClient.mutate({
            mutation: SetMyAvatarImageDocument,
            variables: {
                image: { base64: imageContent }
            }
        });
        expect(uploadResult).to.exist;
        expect(uploadResult.errors).to.exist;
        expect(uploadResult.errors).length(1);
        if (uploadResult.errors) {
            expect(uploadResult.errors[0]).to.exist;
            expect(uploadResult.errors[0].message).to.equal("IMAGE_FORMAT_NOT_SUPPORTED");
        }
    });

    it("setMyAvatarImage_WithHugeImage_ReturnsErrorWithImageTooLargeErrorCode", async () => {
        const imageSizeInBytes = 10_500_000; // Limit is 10_000_000 or 10MB
        const base64CharactersToExceedLimit = (imageSizeInBytes * 4) / 3; // Base64 adds some overhead (~30%) to the content size

        const contentToAdd = "A";
        let multipliedImageContent = "";
        for (let i = 0; i < base64CharactersToExceedLimit; i++) {
            multipliedImageContent += contentToAdd;
        }
        multipliedImageContent += "==";

        const uploadResult = await userAClient.mutate({
            mutation: SetMyAvatarImageDocument,
            variables: {
                image: { base64: multipliedImageContent }
            }
        });

        expect(uploadResult).to.exist;
        expect(uploadResult.errors).to.exist;
        expect(uploadResult.errors).length(1);
        if (uploadResult.errors) {
            expect(uploadResult.errors[0]).to.exist;
            expect(uploadResult.errors[0].message).to.equal("IMAGE_TOO_LARGE");
        }
    }).timeout(10000);

    it("should allow user to create a package and set an image", async () => {
        let response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "first-user-username",
                    packageSlug: "image-test-package",
                    displayName: "Congressional LegislatorsA2",
                    description: "Test upload of congressional legislatorsA2"
                }
            }
        });

        expect(response.errors == null, "no errors").true;

        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        let imageResponse = await userAClient.mutate({
            mutation: SetPackageCoverImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "first-user-username",
                    packageSlug: "image-test-package"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors == null).true;

        const imageServingResult = await request.get(
            "localhost:4000/images/package/first-user-username/image-test-package/avatar"
        );

        expect(imageServingResult.status).equal(200);
    });

    it("should should remove package cover image when deleted", async () => {
        let response = await userAClient.mutate({
            mutation: DeletePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "first-user-username",
                    packageSlug: "image-test-package"
                }
            }
        });

        expect(response.errors == null, "no errors").true;

        let errorFound = false;
        try {
            const imageServingResult = await request.get(
                "localhost:4000/images/package/first-user-username/image-test-package/cover"
            );
        } catch (error) {
            if (error.message == "Not Found") errorFound = true;
        }

        expect(errorFound).equal(true);
    });

    it("should allow user to create a collection and set an image", async () => {
        let response = await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    name: "Image test",
                    collectionSlug: "image-test",
                    description: "Test upload of congressional legislatorsA2"
                }
            }
        });

        expect(response.errors == null, "no errors").true;

        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        let imageResponse = await userAClient.mutate({
            mutation: SetCollectionCoverImageDocument,
            variables: {
                identifier: {
                    collectionSlug: "image-test"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors == null).true;

        let errorFound = false;
        try {
            const imageServingResult = await request.get("localhost:4000/images/collection/image-test/cover");
        } catch (error) {
            if (error.message == "Not Found") errorFound = true;
        }

        expect(errorFound).equal(true);
    });

    it("should not allow user B to set cover image on collection", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        let imageResponse = await userBClient.mutate({
            mutation: SetCollectionCoverImageDocument,
            variables: {
                identifier: {
                    collectionSlug: "image-test"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors!.find((e) => e.message.includes("NOT_AUTHORIZED")) != null).equal(true);
    });

    it("should remove collection cover image when deleted", async () => {
        let response = await userAClient.mutate({
            mutation: DeleteCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "image-test"
                }
            }
        });

        expect(response.errors == null, "no errors").true;

        let errorFound = false;
        try {
            const imageServingResult = await request.get("localhost:4000/images/collection/image-test/cover");
        } catch (error) {
            if (error.message == "Not Found") errorFound = true;
        }

        expect(errorFound).equal(true);
    });

    it("should allow user to set a catalog image", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        let imageResponse = await userAClient.mutate({
            mutation: SetCatalogCoverImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "first-user-username"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors == null).true;

        const imageServingResult = await request.get("localhost:4000/images/catalog/first-user-username/cover");

        expect(imageServingResult.status).equal(200);
    });

    it("should allow accessing the catalog cover after renaming the user", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        let imageResponse = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    username: "new-image-username"
                }
            }
        });

        expect(imageResponse.errors == null).true;

        const imageServingResult = await request.get("localhost:4000/images/catalog/new-image-username/cover");

        expect(imageServingResult.status).equal(200);
    });

    it("should find user cover after renaming the user", async () => {
        const userCoverResult = await request.get("localhost:4000/images/user/new-image-username/cover");

        expect(userCoverResult.status).equal(200);
    });

    it("should find user avatar after renaming the user", async () => {
        const userAvatarResult = await request.get("localhost:4000/images/user/new-image-username/avatar");

        expect(userAvatarResult.status).equal(200);
    });

    // TODO Test downloading package, collection, and catalog images
    // Need to come up with a security framework for public/private listings and images
    // Use GraphQL API instead of an express interface?
    // Change to cookies?

    it("Remove image files when deleting user", async function () {
        const response = await userAClient.mutate({
            mutation: DeleteMeDocument
        });

        expect(response.errors == null).true;
    });
});
