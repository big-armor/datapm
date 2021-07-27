import { expect } from "chai";
import { testCmd } from "./test-utils";

describe("Fallback command", async function () {
    before(async function () {
        this.timeout(5000);
    });

    after(async function () {
        this.timeout(30000);
    });

    it("Should fallback to top level menu", async () => {
        let lineFound = false;
        await testCmd(null, [], [], (line, index, process) => {
            if (line.includes("What action would you like to take?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for fetch command", async () => {
        let lineFound = false;
        await testCmd("fetch", [], [], (line, index, process) => {
            if (line.includes("What is the package file name or url?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for package command", async () => {
        let lineFound = false;
        await testCmd("package", [], [], (line, index, process) => {
            if (line.includes("Source?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for update command", async () => {
        let lineFound = false;
        await testCmd("update", [], [], (line, index, process) => {
            if (line.includes("What is the package file name or url?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for registry command", async () => {
        let lineFound = false;
        await testCmd("registry", [], [], (line, index, process) => {
            if (line.includes("What action would you like to take?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for login command", async () => {
        let lineFound = false;
        await testCmd("registry", ["login"], [], (line, index, process) => {
            if (line.includes("Registry URL?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for logout command", async () => {
        let lineFound = false;
        await testCmd("registry", ["logout"], [], (line, index, process) => {
            if (line.includes("Registry URL?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });
});