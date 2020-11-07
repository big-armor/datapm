import { createAnonymousClient, createUser } from "./test-utils";
import { expect } from "chai";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import * as fs from "fs";
import request = require("superagent");
import { SetMyAvatarImageDocument, SetMyCoverImageDocument } from "./registry-client";

describe("Image Upload Tests", async () => {
    const anonymousUser = createAnonymousClient();
    let userAClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create user", async () => {
        userAClient = await createUser(
            "FirstUserName",
            "FirstUserLastName",
            "first-user-username",
            "first-user@test.datapm.io",
            "passwordA!"
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
    });

    it("Download avatar image", async function () {
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
    });

    it("Download cover image", async function () {
        const imageServingResult = await request.get("localhost:4000/images/user/first-user-username/cover");
        expect(imageServingResult.body).to.exist;
        expect(imageServingResult.type).to.equal("image/jpeg");
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
});
