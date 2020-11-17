import { PercentPipe } from "./percent.pipe";

describe("PercentPipe", () => {
    it("create an instance", () => {
        const pipe = new PercentPipe();
        expect(pipe).toBeTruthy();
    });
});
