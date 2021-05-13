import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { expect } from "chai";
import { CreatePackageDocument, CreateVersionDocument } from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import * as crypto from "crypto";
import { loadPackageFileFromDisk, PackageFile, parsePackageFileJSON } from "datapm-lib";

describe("Publish trival package changes", function () {
    let userAClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create user A", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-publish-trivial-changes",
            "testA-publish-trivial-changes@test.datapm.io",
            "passwordA!"
        );
        expect(userAClient).to.exist;
    });

    it("Should allow user to create a package", async function () {
        let response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-publish-trivial-changes",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.createPackage.catalog?.displayName).to.equal("testA-publish-trivial-changes");
        expect(response.data!.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data!.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data!.createPackage.identifier.catalogSlug).to.equal("testA-publish-trivial-changes");
        expect(response.data!.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data!.createPackage.latestVersion).to.equal(null);
    });

    let packageFile: PackageFile;

    it("User A publish old package file v0.1.0", async function () {
        let packageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/v0.1.0/congressional-legislators-schema-v0.1.0.datapm.json"
        );

        const packageFileString = JSON.stringify(packageFileContents);

        let response;
        try {
            response = await userAClient.mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-publish-trivial-changes",
                        packageSlug: "congressional-legislators"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            });
        } catch (error) {
            console.error(JSON.stringify(error, null, 1));
            expect(false).equal(true);
            return;
        }

        expect(response.errors == null, "no errors").true;
        expect(response.data!.createVersion.author?.username).equal("testA-publish-trivial-changes");

        const responsePackageFileContents = response.data!.createVersion.packageFile;

        const responseHash = crypto.createHash("sha256").update(responsePackageFileContents, "utf8").digest("hex");

        // have to update this hash value if the package file contents change
        expect(responseHash).equal("b79982df4bc5a9a180c4ec2f858554242544f552f40ca54e351d2a81df7ba039");

        packageFile = parsePackageFileJSON(responsePackageFileContents);
    });

    it("Should allow trivial package changes to be published without changing the version", async () => {
        const date = new Date();
        packageFile.updatedDate = date;

        const packageFileString = JSON.stringify(packageFile);

        let response;
        try {
            response = await userAClient.mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-publish-trivial-changes",
                        packageSlug: "congressional-legislators"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            });
        } catch (error) {
            console.error(JSON.stringify(error, null, 1));
            expect(false).equal(true);
            return;
        }

        expect(response.errors == null, "no errors").true;

        const responsePackageFileContents = response.data!.createVersion.packageFile;

        const responseHash = crypto.createHash("sha256").update(responsePackageFileContents, "utf8").digest("hex");

        packageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(packageFile.version).equal("1.0.0");
        expect(packageFile.updatedDate.toISOString()).equal(date.toISOString());
    });
});
