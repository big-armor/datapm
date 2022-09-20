import { createAnonymousClient, createUser } from "./test-utils";
import { expect } from "chai";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import * as fs from "fs";
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
    UpdateMeDocument,
    SetCatalogAvatarImageDocument,
    CreateCatalogDocument,
    DeleteCatalogAvatarImageDocument
} from "./registry-client";
import * as crypto from "crypto";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require("superagent");

describe("Image Upload Tests", async () => {
    const anonymousUser = createAnonymousClient();
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

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
        expect(userAClient).to.not.equal(undefined);
    });

    it("setMyAvatarImage_WithValidImage_UploadsImageAndStoresMetadataInDbAndIsPublic", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        const uploadResult = await userAClient.mutate({
            mutation: SetMyAvatarImageDocument,
            variables: {
                image: { base64: imageContent }
            }
        });

        expect(uploadResult).to.not.equal(undefined);
        expect(uploadResult.errors).to.equal(undefined);
        expect(uploadResult.data).to.not.equal(undefined);

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

        expect(errorFound).to.equal(true);

        const imageWithData = await request
            .get("http://localhost:4000/images/user/first-user-username/avatar")
            .buffer(true)
            .parse(request.parse.image);

        const hash = crypto.createHash("sha256").update(imageWithData.body, "utf8").digest("hex");
        expect(hash).equal("72ad6af0bfc6c6091e6104b45388e1fa431d5696059ebbd31e5f50eca336a081");
    });

    it("Download user avatar image", async function () {
        const imageServingResult = await request.get("localhost:4000/images/user/first-user-username/avatar");

        expect(imageServingResult.body).to.not.equal(undefined);
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
        expect(uploadResult).to.not.equal(undefined);
        expect(uploadResult.errors).to.equal(undefined);
        expect(uploadResult.data).to.not.equal(undefined);

        const imageServingResult = await request.get("localhost:4000/images/user/first-user-username/cover");

        expect(imageServingResult.status).equal(200);
    });

    it("Download user cover image", async function () {
        const imageServingResult = await request.get("http://localhost:4000/images/user/first-user-username/cover");

        expect(imageServingResult.body).to.not.equal(undefined);
        expect(imageServingResult.type).to.equal("image/jpeg");

        const imageWithData = await request
            .get("http://localhost:4000/images/user/first-user-username/cover")
            .buffer(true)
            .parse(request.parse.image);

        const hash = crypto.createHash("sha256").update(imageWithData.body, "utf8").digest("hex");
        expect(hash).equal("af7835de83d877afeda68a13f8497205cf666ea045ca421ab811095732493b8b");
    });

    it("setMyAvatarImage_WithUnsupportedImageFormat_ReturnsErrorWithInvalidFormatErrorCode", async () => {
        const imageContent = "data:image/svg+xml;base64," + fs.readFileSync("test/other-files/ba.svg", "base64");

        const uploadResult = await userAClient.mutate({
            mutation: SetMyAvatarImageDocument,
            variables: {
                image: { base64: imageContent }
            }
        });
        expect(uploadResult).to.not.equal(undefined);
        expect(uploadResult.errors).to.not.equal(undefined);
        expect(uploadResult.errors).length(1);
        if (uploadResult.errors) {
            expect(uploadResult.errors[0]).to.not.equal(undefined);
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

        expect(uploadResult).to.not.equal(undefined);
        expect(uploadResult.errors).to.not.equal(undefined);
        expect(uploadResult.errors).length(1);
        if (uploadResult.errors) {
            expect(uploadResult.errors[0]).to.not.equal(undefined);
            expect(uploadResult.errors[0].message).to.equal("IMAGE_TOO_LARGE");
        }
    }).timeout(10000);

    it("should allow user to create a package and set an image", async () => {
        const response = await userAClient.mutate({
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

        expect(response.errors == null, "no errors").equal(true);

        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        const imageResponse = await userAClient.mutate({
            mutation: SetPackageCoverImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "first-user-username",
                    packageSlug: "image-test-package"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors == null).equal(true);

        const imageServingResult = await request.get(
            "localhost:4000/images/package/first-user-username/image-test-package/cover"
        );

        expect(imageServingResult.status).equal(200);
    });

    it("should should remove package cover image when deleted", async () => {
        const response = await userAClient.mutate({
            mutation: DeletePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "first-user-username",
                    packageSlug: "image-test-package"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        let errorFound = false;
        try {
            const imageServingResult = await request.get(
                "localhost:4000/images/package/first-user-username/image-test-package/cover"
            );
        } catch (error) {
            if (error.message === "Not Found") errorFound = true;
        }

        expect(errorFound).equal(true);
    });

    it("should allow user to create a collection and set an image", async () => {
        const response = await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    name: "Image test",
                    collectionSlug: "image-test",
                    description: "Test upload of congressional legislatorsA2"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        const imageResponse = await userAClient.mutate({
            mutation: SetCollectionCoverImageDocument,
            variables: {
                identifier: {
                    collectionSlug: "image-test"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors == null).equal(true);

        const imageServingResult = await request.get("localhost:4000/images/collection/image-test/cover");
        expect(imageServingResult.status).equal(200);
    });

    it("should not allow user B to set cover image on collection", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        const imageResponse = await userBClient.mutate({
            mutation: SetCollectionCoverImageDocument,
            variables: {
                identifier: {
                    collectionSlug: "image-test"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors?.find((e) => e.message.includes("NOT_AUTHORIZED")) != null).equal(true);
    });

    it("should remove collection cover and avatar image when deleted", async () => {
        const response = await userAClient.mutate({
            mutation: DeleteCollectionDocument,
            variables: {
                identifier: {
                    collectionSlug: "image-test"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        let avatarImageErrorFound = false;
        let coverImageErrorFound = false;

        try {
            await request.get("localhost:4000/images/collection/image-test/cover");
        } catch (error) {
            if (error.message === "Not Found") {
                avatarImageErrorFound = true;
            }
        }
        try {
            await request.get("localhost:4000/images/collection/image-test/cover");
        } catch (error) {
            if (error.message === "Not Found") {
                coverImageErrorFound = true;
            }
        }

        expect(avatarImageErrorFound).equal(true);
        expect(coverImageErrorFound).equal(true);
    });

    it("should allow user to set a catalog cover image", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        const imageResponse = await userAClient.mutate({
            mutation: SetCatalogCoverImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "first-user-username"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors == null).equal(true);

        const imageServingResult = await request.get("localhost:4000/images/catalog/first-user-username/cover");

        expect(imageServingResult.status).equal(200);
    });

    it("should allow user to set a catalog avatar image", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");
        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-image-catalog",
                    displayName: "User A Catalog v1",
                    description: "This is an integration test User A v1 Catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        const imageResponse = await userAClient.mutate({
            mutation: SetCatalogAvatarImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-image-catalog"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors == null).equal(true);

        const imageServingResult = await request.get("localhost:4000/images/catalog/user-image-catalog/avatar");

        expect(imageServingResult.status).equal(200);
    });

    it("should allow user to delete a catalog avatar image", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");
        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "user-image-catalog-2",
                    displayName: "User A Catalog",
                    description: "This is an integration test User A v1 Catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        const setImageResponse = await userAClient.mutate({
            mutation: SetCatalogAvatarImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-image-catalog-2"
                },
                image: { base64: imageContent }
            }
        });

        expect(setImageResponse.errors == null).equal(true);

        const deleteImageResponse = await userAClient.mutate({
            mutation: DeleteCatalogAvatarImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "user-image-catalog-2"
                }
            }
        });

        expect(deleteImageResponse.errors == null).equal(true);

        let imageNotFound = false;
        try {
            await request.get("localhost:4000/images/catalog/user-image-catalog-2/avatar");
        } catch (error) {
            if (error.message === "Not Found") {
                imageNotFound = true;
            }
        }

        expect(imageNotFound).equal(true);
    });

    it("should not allow user to set a user catalog avatar", async () => {
        const imageContent = fs.readFileSync("test/other-files/ba.jpg", "base64");

        const imageResponse = await userAClient.mutate({
            mutation: SetCatalogAvatarImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "first-user-username"
                },
                image: { base64: imageContent }
            }
        });

        expect(imageResponse.errors?.some((e) => e.message === "AVATAR_NOT_ALLOWED_ON_USER_CATALOGS"));
    });

    it("should not allow user to delete a user catalog avatar", async () => {
        const imageResponse = await userAClient.mutate({
            mutation: DeleteCatalogAvatarImageDocument,
            variables: {
                identifier: {
                    catalogSlug: "first-user-username"
                }
            }
        });

        expect(imageResponse.errors?.some((e) => e.message === "AVATAR_NOT_ALLOWED_ON_USER_CATALOGS"));
    });

    it("should allow accessing the catalog cover after renaming the user", async () => {
        const imageResponse = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    username: "new-image-username"
                }
            }
        });

        expect(imageResponse.errors == null).equal(true);

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

        expect(response.errors == null).equal(true);
    });
});
