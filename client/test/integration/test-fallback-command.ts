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
        await testCmd(null, [], [], async (line: string, index, process) => {
            if (line.includes("What action would you like to take?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for fetch command", async () => {
        let lineFound = false;
        await testCmd("fetch", [], [], async (line: string, index, process) => {
            if (line.includes("Source package or connector name?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for info command", async () => {
        let lineFound = false;
        await testCmd("info", [], [], async (line: string, index, process) => {
            if (line.includes("Package identifier, url, or file?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for package command", async () => {
        let lineFound = false;
        await testCmd("package", [], [], async (line: string, index, process) => {
            if (line.includes("Source?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for publish command", async () => {
        let lineFound = false;
        await testCmd("publish", [], [], async (line: string, index, process) => {
            if (line.includes("What is the package name, url, or file name?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for edit command", async () => {
        let lineFound = false;
        await testCmd("edit", [], [], async (line: string, index, process) => {
            if (line.includes("What is the package name, url, or file name?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for update command", async () => {
        let lineFound = false;
        await testCmd("update", [], [], async (line: string, index, process) => {
            if (line.includes("What is the package name, url, or file name?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for registry command", async () => {
        let lineFound = false;
        await testCmd("registry", [], [], async (line: string, index, process) => {
            if (line.includes("What action would you like to take?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for login command", async () => {
        let lineFound = false;
        await testCmd("registry", ["login"], [], async (line: string, index, process) => {
            if (line.includes("Registry URL?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });

    it("Should fallback for logout command", async () => {
        let lineFound = false;
        await testCmd("registry", ["logout"], [], async (line: string, index, process) => {
            if (line.includes("Registry URL?")) {
                lineFound = true;
                process.kill(9);
            }
        });

        expect(lineFound).equal(true);
    });
});
