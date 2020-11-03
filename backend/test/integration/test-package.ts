import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import {
    CreatePackageDocument,
    PackageDocument,
    UpdateCatalogDocument,
    UpdatePackageDocument,
    CreateVersionDocument,
    DisablePackageDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import * as fs from "fs";
import * as crypto from "crypto";
import { PackageFile } from "datapm-lib";
import { describe, it } from "mocha";

describe("Package Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-packages",
            "testA-packages@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-packages",
            "testB-packages@test.datapm.io",
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
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.createPackage.catalog.displayName).to.equal("testA-packages");
        expect(response.data!.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data!.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data!.createPackage.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data!.createPackage.latestVersion).to.equal(null);
    });

    it("package should not be available anonymously", async function () {
        let response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
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
                    catalogSlug: "testA-packages",
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

    it("User A can get package", async function () {
        let response = await userAClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data!.package!.catalog.displayName).to.equal("testA-packages");
        expect(response.data!.package!.description).to.equal("Test upload of congressional legislators");
        expect(response.data!.package!.displayName).to.equal("Congressional Legislators");
        expect(response.data!.package!.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.package!.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data!.package!.latestVersion).to.equal(null);
    });

    it("User A can update package", async function () {
        let response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    description: "New description",
                    displayName: "New displayName",
                    isPublic: true,
                    newPackageSlug: "new-package-slug"
                }
            }
        });
        expect(response.errors == null, "no errors").equal(true);
        expect(response.data!.updatePackage.catalog.displayName).to.equal("testA-packages");
        expect(response.data!.updatePackage.description).to.equal("New description");
        expect(response.data!.updatePackage.displayName).to.equal("New displayName");
        expect(response.data!.updatePackage.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.updatePackage.identifier.packageSlug).to.equal("new-package-slug");
        expect(response.data!.updatePackage.latestVersion).to.equal(null);
    });

    it("package should not be available anonymously - catalog is private", async function () {
        let response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
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

    it("User A set catalog public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data!.updateCatalog.isPublic).equal(true);
    });

    it("Anonymous user can access package", async function () {
        let response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data!.package.catalog.displayName).to.equal("testA-packages");
        expect(response.data!.package.description).to.equal("New description");
        expect(response.data!.package.displayName).to.equal("New displayName");
        expect(response.data!.package.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.package.identifier.packageSlug).to.equal("new-package-slug");
        expect(response.data!.package.latestVersion).to.equal(null);
    });

    it("user B can access package", async function () {
        let response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data!.package.catalog.displayName).to.equal("testA-packages");
        expect(response.data!.package.description).to.equal("New description");
        expect(response.data!.package.displayName).to.equal("New displayName");
        expect(response.data!.package.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.package.identifier.packageSlug).to.equal("new-package-slug");
        expect(response.data!.package.latestVersion).to.equal(null);
    });

    it("User b can not update package", async function () {
        let response = await userBClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    description: "New description should not be accepted",
                    displayName: "New displayName should not be accepted",
                    isPublic: true,
                    newPackageSlug: "new-package-slug-not-accepted"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "NOT_AUTHORIZED") != null,
            "should have authorization error"
        ).equal(true);
    });

    it("Anonymous can not update package", async function () {
        let response = await anonymousClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    description: "New description should not be accepted",
                    displayName: "New displayName should not be accepted",
                    isPublic: true,
                    newPackageSlug: "new-package-slug-not-accepted"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "NOT_AUTHENTICATED") != null,
            "should have authentication error"
        ).equal(true);
    });

    it("User A publish first version", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let hash = crypto.createHash("sha256").update(packageFileContents, "utf8").digest("hex");
        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFileContents
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.createVersion.author.username).equal("testA-packages");

        const responsePackageFileContents = response.data!.createVersion.packageFile;

        const responseHash = crypto.createHash("sha256").update(responsePackageFileContents, "utf8").digest("hex");

        // have to update this hash value if the package file contents change
        expect(responseHash).equal("7b099af18acd06ce94b3e13dcb1feb0a6637764b2cc4b6cac27e52f8267caf16");
    });

    it("Anonymous get package file", async function () {
        let response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.package.catalog.displayName).to.equal("testA-packages");
        expect(response.data!.package.description).to.equal("New description");
        expect(response.data!.package.displayName).to.equal("New displayName");
        expect(response.data!.package.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.package.identifier.packageSlug).to.equal("new-package-slug");

        expect(response.data!.package.latestVersion!.identifier.versionMajor).equal(1);
        expect(response.data!.package.latestVersion!.identifier.versionMinor).equal(0);
        expect(response.data!.package.latestVersion!.identifier.versionPatch).equal(0);

        const responsePackageFileContents = response.data!.package.latestVersion!.packageFile;

        const responseHash = crypto.createHash("sha256").update(responsePackageFileContents, "utf8").digest("hex");

        // have to update this hash value if the package file contents change
        expect(responseHash).equal("7b099af18acd06ce94b3e13dcb1feb0a6637764b2cc4b6cac27e52f8267caf16");
    });

    it("User A publish second version - fail no changes", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: packageFileContents
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.extensions!.code == "VERSION_EXISTS") != null,
            "should have version exists"
        ).equal(true);
    });

    it("User A publish malformed package JSON", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        packageFileContents += "}";

        let errorFound = false;

        let response = await userAClient
            .mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-packages",
                        packageSlug: "new-package-slug"
                    },
                    value: {
                        packageFile: JSON.stringify(packageFileContents)
                    }
                }
            })
            .catch((error: ErrorResponse) => {
                let fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find((s) =>
                                s.startsWith("ValidationError: INVALID_PACKAGE_FILE_SCHEMA")
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "invalid schema error not found").equal(true);
            });
    });

    it("User A publish invalid schema - packageSlug", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let packageFile = JSON.parse(packageFileContents) as PackageFile;
        packageFile.packageSlug += "-";

        let errorFound = false;

        let response = await userAClient
            .mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-packages",
                        packageSlug: "new-package-slug"
                    },
                    value: {
                        packageFile: JSON.stringify(packageFile)
                    }
                }
            })
            .catch((error: ErrorResponse) => {
                let fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find((s) =>
                                s.startsWith("ValidationError: INVALID_PACKAGE_FILE_SCHEMA")
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "invalid schema error not found").equal(true);
            });
    });

    it("User A update package schema - patch - fail on version", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let packageFile = JSON.parse(packageFileContents) as PackageFile;

        packageFile.description = "new description";

        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: JSON.stringify(packageFile)
                }
            }
        });

        expect(response.errors != null, "should  have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.extensions!.code == "HIGHER_VERSION_REQUIRED") != null,
            "should have higher version required"
        ).equal(true);
    });

    it("User A update package schema - patch", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let packageFile = JSON.parse(packageFileContents) as PackageFile;

        packageFile.description = "new description";
        packageFile.version = "1.0.1";

        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: JSON.stringify(packageFile)
                }
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data!.createVersion.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.createVersion.identifier.packageSlug).to.equal("new-package-slug");

        expect(response.data!.createVersion.identifier.versionMajor).equal(1);
        expect(response.data!.createVersion.identifier.versionMinor).equal(0);
        expect(response.data!.createVersion.identifier.versionPatch).equal(1);
    });

    it("User A update package schema - minor - fail on version number", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let packageFile = JSON.parse(packageFileContents) as PackageFile;

        packageFile.version = "1.0.2";
        packageFile.schemas[0].properties!["new_column"] = {
            title: "new_column",
            recordCount: 1234,
            byteCount: 5678,
            valueTypes: {
                string: {
                    recordCount: 3238,
                    valueType: "string",
                    stringMaxLength: 17,
                    stringMinLength: 3
                }
            },
            type: ["string"]
        };

        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: JSON.stringify(packageFile)
                }
            }
        });

        expect(response.errors != null, "should  have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.extensions!.code == "HIGHER_VERSION_REQUIRED") != null,
            "should have higher version required"
        ).equal(true);
    });

    it("User A update package schema - minor", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let packageFile = JSON.parse(packageFileContents) as PackageFile;

        packageFile.version = "1.2.0";
        packageFile.schemas[0].properties!["new_column"] = {
            title: "new_column",
            recordCount: 1234,
            byteCount: 5678,
            valueTypes: {
                string: {
                    recordCount: 3238,
                    valueType: "string",
                    stringMaxLength: 17,
                    stringMinLength: 3
                }
            },
            type: ["string"]
        };

        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: JSON.stringify(packageFile)
                }
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data!.createVersion.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.createVersion.identifier.packageSlug).to.equal("new-package-slug");

        expect(response.data!.createVersion.identifier.versionMajor).equal(1);
        expect(response.data!.createVersion.identifier.versionMinor).equal(2);
        expect(response.data!.createVersion.identifier.versionPatch).equal(0);
    });

    it("User A update package schema - major - fail high version required", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let packageFile = JSON.parse(packageFileContents) as PackageFile;

        packageFile.version = "1.3.0";

        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: JSON.stringify(packageFile)
                }
            }
        });

        expect(response.errors != null, "should  have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.extensions!.code == "HIGHER_VERSION_REQUIRED") != null,
            "should have higher version required"
        ).equal(true);
    });

    it("User A update package schema - major", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");

        let packageFile = JSON.parse(packageFileContents) as PackageFile;

        packageFile.version = "2.0.0";

        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                },
                value: {
                    packageFile: JSON.stringify(packageFile)
                }
            }
        });

        expect(response.errors == null, "should not have errors").to.equal(true);
        expect(response.data!.createVersion.identifier.catalogSlug).to.equal("testA-packages");
        expect(response.data!.createVersion.identifier.packageSlug).to.equal("new-package-slug");

        expect(response.data!.createVersion.identifier.versionMajor).equal(2);
        expect(response.data!.createVersion.identifier.versionMinor).equal(0);
        expect(response.data!.createVersion.identifier.versionPatch).equal(0);
    });

    it("User A delete package", async function () {
        let response = await userAClient.mutate({
            mutation: DisablePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.disablePackage.identifier.packageSlug.startsWith("new-package-slug-DISABLED-")).true;
    });

    it("Anonymous User get Package", async function () {
        let response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages",
                    packageSlug: "new-package-slug"
                }
            }
        });

        expect(response.errors != null, "should have errors").to.equal(true);
        expect(
            response.errors!.find((e) => e.message == "PACKAGE_NOT_FOUND") != null,
            "should have not package not found error"
        ).equal(true);
    });
});
