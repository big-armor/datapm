import { PackageSizePipe } from "./package-size.pipe";

describe("PackageSizePipe", () => {
    it("create an instance", () => {
        const pipe = new PackageSizePipe();
        expect(pipe).toBeTruthy();
    });
});
