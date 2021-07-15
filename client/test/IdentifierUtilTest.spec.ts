import { isCatalogIdentifier, isPackageIdentifier, isVersionIdentifier } from "../src/util/IdentifierUtil";
import { CatalogIdentifier, PackageIdentifier, VersionIdentifier } from "../src/generated/graphql";
import { test } from "mocha";

import { expect } from "chai";

describe("Checking VersionUtil", () => {
    test("Catalog Identifier Test", () => {
        const identifier = {
            registryURL: "http://localhost:4000",
            catalogSlug: "catalog"
        } as CatalogIdentifier;

        expect(isVersionIdentifier(identifier)).equal(false);
        expect(isPackageIdentifier(identifier)).equal(false);
        expect(isCatalogIdentifier(identifier)).equal(true);
        expect(identifier.catalogSlug).equal("catalog");
        expect(identifier.registryURL).equal("http://localhost:4000");
    });

    test("Package Identifier Test", () => {
        const identifier = {
            registryURL: "http://localhost:4000",
            catalogSlug: "catalog",
            packageSlug: "package"
        } as PackageIdentifier;

        expect(isVersionIdentifier(identifier)).equal(false);
        expect(isPackageIdentifier(identifier)).equal(true);
        expect(isCatalogIdentifier(identifier)).equal(false);
        expect(identifier.catalogSlug).equal("catalog");
        expect(identifier.registryURL).equal("http://localhost:4000");
        expect(identifier.packageSlug).equal("package");
    });

    test("Version Identifier Test", () => {
        const identifier = {
            registryURL: "http://localhost:4000",
            catalogSlug: "catalog",
            packageSlug: "package",
            versionMajor: 3,
            versionMinor: 2,
            versionPatch: 1
        } as VersionIdentifier;

        expect(isVersionIdentifier(identifier)).equal(true);
        expect(isPackageIdentifier(identifier)).equal(false);
        expect(isCatalogIdentifier(identifier)).equal(true);
        expect(identifier.catalogSlug).equal("catalog");
        expect(identifier.registryURL).equal("http://localhost:4000");
        expect(identifier.packageSlug).equal("package");
        expect(identifier.versionMajor).equal(3);
        expect(identifier.versionMinor).equal(2);
        expect(identifier.versionPatch).equal(1);
    });
});
