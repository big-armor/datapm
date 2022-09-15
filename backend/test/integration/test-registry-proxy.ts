import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreatePackageDocument,
    PackageDocument,
    UpdateCatalogDocument,
    UpdatePackageDocument,
    CreateVersionDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import * as crypto from "crypto";
import { parsePackageFileJSON, loadPackageFileFromDisk, PublishMethod } from "datapm-lib";
import { describe, it } from "mocha";

/** Tests when the registry is used as a proxy for a published data package */
describe("Package Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-registry-proxy",
            "testA-registry-proxy@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-registry-proxy",
            "testB-registry-proxy@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Create a test package for proxying data with no authentication", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-registry-proxy",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-registry-proxy");
        expect(response.data?.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-registry-proxy");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        packageFileContents.registries = [
            {
                catalogSlug: "testA-registry-proxy",
                publishMethod: PublishMethod.SCHEMA_PROXY_DATA,
                url: "http://localhost:4200"
            }
        ];

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-proxy",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createVersion.author?.username).equal("testA-registry-proxy");

        const responsePackageFileContents = response.data?.createVersion.packageFile;

        const responsePackageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(responsePackageFile.readmeMarkdown).includes("This is where a readme might go");
        expect(responsePackageFile.licenseMarkdown).includes("This is not a real license. Just a test.");

        if (responsePackageFile.registries == null) {
            throw new Error("No registries");
        }
        expect(responsePackageFile.registries[0].publishMethod).equal(PublishMethod.SCHEMA_PROXY_DATA);
        expect(responsePackageFile.sources[0].type).equal("datapmRegistryProxy");
        expect(responsePackageFile.sources[0].streamSets[0].slug).equal(
            "https://theunitedstates.io/congress-legislators/legislators-current.csv"
        );
    });

    it("User can set catalog public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,

            variables: {
                identifier: {
                    catalogSlug: "testA-registry-proxy"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("User A can update package", async function () {
        const response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-proxy",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.updatePackage.catalog?.displayName).to.equal("testA-registry-proxy");
        expect(response.data?.updatePackage.latestVersion).to.not.equal(null);

        const identifier = response.data?.updatePackage.latestVersion?.identifier;

        expect(identifier?.versionMajor).to.equal(1);
        expect(identifier?.versionMinor).to.equal(0);
        expect(identifier?.versionPatch).to.equal(0);
    });

    it("Anonymous user can access package with proxy info", async function () {
        const response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-proxy",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const responsePackageFileContents = response.data?.package.latestVersion?.packageFile;

        const responsePackageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(responsePackageFile.sources.length).to.equal(1);
        expect(responsePackageFile.sources[0].type).equal("datapmRegistryProxy");
        expect(responsePackageFile.sources[0].configuration?.catalogSlug).equal("testA-registry-proxy");
        expect(responsePackageFile.sources[0].configuration?.packageSlug).equal("congressional-legislators");
        expect(responsePackageFile.sources[0].streamSets[0].slug).equal(
            "https://theunitedstates.io/congress-legislators/legislators-current.csv"
        );
    });
});
