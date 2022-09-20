import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { expect } from "chai";
import { CreatePackageDocument, CreateVersionDocument } from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import { loadPackageFileFromDisk, parsePackageFileJSON } from "datapm-lib";

describe("Upgrading package files automatically", function () {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-package-auto-upgrade",
            "testA-package-auto-upgrade@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-package-auto-upgrade",
            "testB-package-auto-upgrade@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Should allow user to create a package", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-package-auto-upgrade",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-package-auto-upgrade");
        expect(response.data?.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-package-auto-upgrade");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish old package file v0.1.0", async function () {
        const packageFileContents = loadPackageFileFromDisk(
            "test/packageFiles/v0.1.0/congressional-legislators-schema-v0.1.0.datapm.json"
        );

        const packageFileString = JSON.stringify(packageFileContents);

        let response;
        try {
            response = await userAClient.mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-package-auto-upgrade",
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

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createVersion.author?.username).equal("testA-package-auto-upgrade");

        const responsePackageFileContents = response.data?.createVersion.packageFile;

        const packageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(packageFile.$schema).equals("https://datapm.io/docs/package-file-schema-v0.32.1.json");
        expect(packageFile.licenseMarkdown).includes("This is not a real license. Just a test.");

        expect(Array.isArray(packageFile.sources[0].configuration?.uris)).equal(true);

        expect(packageFile.canonical).equal(true);
    });
});
