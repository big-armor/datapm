import { VersionPipe } from "./version.pipe";

describe("VersionPipe", () => {
    it("create an instance", () => {
        const pipe = new VersionPipe();
        expect(pipe).toBeTruthy();
    });
});
