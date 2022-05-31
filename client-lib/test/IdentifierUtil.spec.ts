import { expect } from "chai";
import { identifierToString } from "../src/util/IdentifierUtil";

describe("Identifier Util checks", () => {
    it("Should not include https://datapm.io registry url", () => {
        const packageReference = identifierToString({
            registryURL: "https://datapm.io",
            catalogSlug: "catalog",
            packageSlug: "package"
        });

        expect(packageReference).to.equal("catalog/package");
    });

    it("Should not include http://wwww.datapm.io/ registry url", () => {
        const packageReference = identifierToString({
            registryURL: "http://www.datapm.io/",
            catalogSlug: "catalog",
            packageSlug: "package"
        });

        expect(packageReference).to.equal("catalog/package");
    });

    it("Should include http://test.datapm.io registry url", () => {
        const packageReference = identifierToString({
            registryURL: "http://test.datapm.io",
            catalogSlug: "catalog",
            packageSlug: "package"
        });

        expect(packageReference).to.equal("http://test.datapm.io/catalog/package");
    });
});
