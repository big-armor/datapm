import { InputErrorPipe } from "./input-error.pipe";

describe("InputErrorPipe", () => {
    it("create an instance", () => {
        const pipe = new InputErrorPipe();
        expect(pipe).toBeTruthy();
    });
});
