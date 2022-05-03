import { expect } from "chai";
import { POSTGRES_TYPE, RepositoryCredentialsConfig } from "datapm-client-lib";
import { getRepositoryConfigs, resetConfiguration } from "../../src/util/ConfigUtil";
import { KEYS, testCmd } from "./test-utils";

describe("Repository Command Tests", async function () {
    const updateRepositoryLogLines: string[] = [];
    const addRepositoryLogLines: string[] = [];

    before(async () => {
        resetConfiguration();
    });

    after(() => {
        resetConfiguration();
    });

    it("Add repository A", async function () {
        await testCmd(
            "repository",
            ["add"],
            [
                {
                    message: "Type?",
                    input: "Postgresql" + KEYS.ENTER
                },
                {
                    message: "Hostname or IP?",
                    input: "testhost" + KEYS.ENTER
                },
                {
                    message: "Port?",
                    input: "999" + KEYS.ENTER
                },
                {
                    message: "Username?",
                    input: "postgres" + KEYS.ENTER
                },
                {
                    message: "Password?",
                    input: "postgres" + KEYS.ENTER
                }
            ],
            async (line) => {
                addRepositoryLogLines.push(line);
            }
        );

        const repositories = getRepositoryConfigs(POSTGRES_TYPE);

        expect(repositories.length).equal(1);
        expect(repositories[0].connectionConfiguration.host).equal(`testhost`);
        expect(repositories[0].connectionConfiguration.port).equal(999);
        expect((repositories[0].credentials as RepositoryCredentialsConfig[])[0].identifier).equal(`postgres`);
    });

    it("Update Repository", async function () {
        const exitCode = await testCmd(
            "repository",
            ["update"],
            [
                {
                    message: "Type?",
                    input: "Postgres" + KEYS.ENTER
                },
                {
                    message: "Repository to Update?",
                    input: "testhost:999" + KEYS.ENTER
                },
                {
                    message: "Hostname or IP?",
                    input: "newhost" + KEYS.ENTER
                },
                {
                    message: "Port",
                    input: "888" + KEYS.ENTER
                },
                {
                    message: "Credentials?",
                    input: "add" + KEYS.ENTER
                },
                {
                    message: "Username?",
                    input: "another" + KEYS.ENTER
                },
                {
                    message: "Password",
                    input: "testing" + KEYS.ENTER
                }
            ],
            async (line) => {
                updateRepositoryLogLines.push(line);
            }
        );

        expect(exitCode.code).equal(0);
        const repositories = getRepositoryConfigs(POSTGRES_TYPE);

        expect(repositories.length).equal(1);
        expect(repositories[0].connectionConfiguration.host).equal(`newhost`);
        expect(repositories[0].connectionConfiguration.port).equal(888);
        expect((repositories[0].credentials as RepositoryCredentialsConfig[])[0].identifier).equal(`postgres`);
        expect((repositories[0].credentials as RepositoryCredentialsConfig[])[1].identifier).equal(`another`);
    });

    it("Add Credential", async function () {
        const logLines: string[] = [];

        const exitCode = await testCmd(
            "repository",
            ["credential", "add"],
            [
                {
                    message: "Repository Type?",
                    input: "Postgres" + KEYS.ENTER
                },
                {
                    message: "Repository?",
                    input: "newhost:888" + KEYS.ENTER
                },
                {
                    message: "Username?",
                    input: "another2" + KEYS.ENTER
                },
                {
                    message: "Password",
                    input: "testing" + KEYS.ENTER
                }
            ],
            async (line) => {
                logLines.push(line);
            }
        );

        try {
            expect(exitCode.code).equal(0);
        } catch (e) {
            console.log("Error during add credentials");

            console.log("");
            console.log("Add Repository Logs");
            for (const line of addRepositoryLogLines) {
                console.log(line);
            }

            console.log("");
            console.log("Update Repository Logs");
            for (const line of updateRepositoryLogLines) {
                console.log(line);
            }

            console.log("");
            console.log("Add Credential Logs");
            for (const line of logLines) {
                console.log(line);
            }
            throw e;
        }
        const repositories = getRepositoryConfigs(POSTGRES_TYPE);

        expect(repositories.length).equal(1);
        expect(repositories[0].connectionConfiguration.host).equal(`newhost`);
        expect(repositories[0].connectionConfiguration.port).equal(888);
        expect((repositories[0].credentials as RepositoryCredentialsConfig[])[0].identifier).equal(`postgres`);
        expect((repositories[0].credentials as RepositoryCredentialsConfig[])[1].identifier).equal(`another`);
        expect((repositories[0].credentials as RepositoryCredentialsConfig[])[2].identifier).equal(`another2`);
    });

    it("Remove Credential", async function () {
        const exitCode = await testCmd(
            "repository",
            ["credential", "remove"],
            [
                {
                    message: "Repository Type?",
                    input: "Postgres" + KEYS.ENTER
                },
                {
                    message: "Repository?",
                    input: "newhost:888" + KEYS.ENTER
                },
                {
                    message: "Credential to Remove?",
                    input: "postgres" + KEYS.ENTER
                }
            ]
        );

        expect(exitCode.code).equal(0);
        const repositories = getRepositoryConfigs(POSTGRES_TYPE);

        expect(repositories.length).equal(1);
        expect(repositories[0].connectionConfiguration.host).equal(`newhost`);
        expect(repositories[0].connectionConfiguration.port).equal(888);
        expect((repositories[0].credentials as RepositoryCredentialsConfig[])[0].identifier).equal(`another`);
        expect((repositories[0].credentials as RepositoryCredentialsConfig[])[1].identifier).equal(`another2`);
    });

    it("Remove repository", async function () {
        const exitCode = await testCmd(
            "repository",
            ["remove"],
            [
                {
                    message: "Type?",
                    input: "Postgres" + KEYS.ENTER
                },
                {
                    message: "Repository to remove?",
                    input: "newhost:888" + KEYS.ENTER
                }
            ]
        );

        const repositories = getRepositoryConfigs(POSTGRES_TYPE);

        expect(exitCode.code).equal(0);

        expect(repositories.length).equal(0);
    });
});
