import { createUser } from "./test-utils";
import { expect } from "chai";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import * as fs from "fs";
import { SetMyAvatarImageDocument } from "./registry-client";
import { FileUpload } from "graphql-upload";

describe("Image Upload Tests", async () => {
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

    it("setMyAvatarImage_WithValidImage_UploadsImageAndStoresMetadataInDb", async () => {
        const imageFile: any = {
            filename: "ba.jpg",
            encoding: "utf-8",
            mimetype: "image/jpg",
            createReadStream: () => fs.createReadStream("test/other-files/ba.jpg")
        };

        const image = await userAClient.mutate({
            mutation: SetMyAvatarImageDocument,
            variables: {
                image: imageFile
            },
            context: {
                useMultipart: true
            }
        });

        expect(image).to.exist;
    });

    it("setMyAvatarImage_WithInvalidValidImageFormat_ReturnsErrorWithInvalidFormatErrorCode", async () => {
        const imageFile = {
            filename: "ba.jpg",
            encoding: "utf-8",
            mimetype: "image/gif"
        } as FileUpload;
        const image = await userAClient.mutate({
            mutation: SetMyAvatarImageDocument,
            variables: {
                image: Promise.resolve(imageFile)
            },
            context: {
                context: {
                    useMultipart: true
                }
            }
        });

        expect(image).to.exist;
        expect(image.errors).to.exist;
        expect(image.errors).length(1);
        if (image.errors) {
            expect(image.errors[0]).to.exist;
            expect(image.errors[0].message).to.equal("IMAGE_FORMAT_NOT_SUPPORTED");
        }
    });
});
