import { NormalizedCacheObject } from "@apollo/client/cache";
import { ApolloClient } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk, parsePackageFileJSON } from "datapm-lib";
import { describe } from "mocha";
import { AddOrUpdateGroupToPackageDocument, AddOrUpdateUserToGroupDocument, CreateGroupDocument, CreatePackageDocument, CreateVersionDocument, PackageDocument, Permission, RemoveGroupFromPackageDocument, UpdatePackageDocument } from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Group Package Access", () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    before(async () => {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-group-package",
            "testA-group-package@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-group-package",
            "testB-group-package@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

it("Should allow user to create a package", async function () {
        let response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.createPackage.catalog?.displayName).to.equal("testA-group-package");
        expect(response.data!.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data!.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data!.createPackage.identifier.catalogSlug).to.equal("testA-group-package");
        expect(response.data!.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data!.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        let response;
        try {
            response = await userAClient.mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-group-package",
                        packageSlug: "congressional-legislators"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            });
        } catch (error) {
            console.error(JSON.stringify(error, null, 1));
            return;
        }

        expect(response.errors == null, "no errors").true;
        expect(response.data!.createVersion.author?.username).equal("testA-group-package");

        const responsePackageFileContents = response.data!.createVersion.packageFile;

        const packageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(packageFile.readmeMarkdown).includes("This is where a readme might go");
        expect(packageFile.licenseMarkdown).includes("This is not a real license. Just a test.");
    });

it("package should not be available anonymously", async function () {
        let response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "NOT_AUTHENTICATED") != null,
            "should have not authenticated error"
        ).equal(true);
    });

    it("package should not be available to user B", async function () {
        let response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "NOT_AUTHORIZED") != null,
            "should have not authorization error"
        ).equal(true);
    });

    it("Create group", async () => {
        const response = await userAClient.mutate({
            mutation: CreateGroupDocument,
            variables: {
                groupSlug: "test-group-package",
                name: "Test Group"
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Add userB to group with view permission", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateUserToGroupDocument,
            variables: {
                groupSlug: "test-group-package",
                username: "testB-group-package",
                permissions: [Permission.VIEW]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Grant group view access to package", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToPackageDocument,
            variables: {
                groupSlug: "test-group-package",
                packageIdentifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                },
                permissions: [Permission.VIEW]
            }

        });

        expect(response.errors == null, "no errors").to.equal(true);

    });

    it("UserB should be able to view package", async () => {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.package.displayName).to.equal("Congressional Legislators");
    });

    it("UserB should not be able to modify package", async () => {

        const response =  await userBClient.mutate({
            mutation: UpdatePackageDocument, 
            variables: {
                identifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    description: "This is a test package"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(response.errors![0].message).to.equal("NOT_AUTHORIZED");

    });


    it("Grant group edit access to package", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToPackageDocument,
            variables: {
                groupSlug: "test-group-package",
                packageIdentifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                },
                permissions: [Permission.VIEW, Permission.EDIT]
            }

        });

        expect(response.errors == null, "no errors").to.equal(true);

    });

    it("UserB should be able to modify package", async () => {

        const response =  await userBClient.mutate({
            mutation: UpdatePackageDocument, 
            variables: {
                identifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    description: "This is a test package"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.updatePackage.description).to.equal("This is a test package");

    });

    it("UserB should not be able to remove a group", async () => {

        const response = await userBClient.mutate({
            mutation: RemoveGroupFromPackageDocument,
            variables: {
                groupSlug: "test-group-package",
                packageIdentifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(response.errors![0].message).to.equal("NOT_AUTHORIZED");
    
    });

    it("Grant group manage access to package", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateGroupToPackageDocument,
            variables: {
                groupSlug: "test-group-package",
                packageIdentifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                },
                permissions: [Permission.VIEW, Permission.EDIT, Permission.MANAGE]
            }

        });

        expect(response.errors == null, "no errors").to.equal(true);

    });


    it("UserB should be able to remove a group", async () => {

        const response = await userBClient.mutate({
            mutation: RemoveGroupFromPackageDocument,
            variables: {
                groupSlug: "test-group-package",
                packageIdentifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    
    });

    it("package should not be available to user B", async function () {
        let response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-group-package",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "NOT_AUTHORIZED") != null,
            "should have not authorization error"
        ).equal(true);
    });

    
});