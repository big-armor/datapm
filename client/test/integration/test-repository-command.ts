import { expect } from "chai";
import { TYPE as POSTGRES_TYPE } from "../../src/repository/database/postgres/PostgresRepositoryDescription";
import { getRepositoryConfigs, RepositoryCredentialsConfig, resetConfiguration } from "../../src/util/ConfigUtil";
import { KEYS, testCmd } from "./test-utils";

describe("Repository Command Tests", async function () {
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
            ]
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
            ]
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
            (line) => console.log(line)
        );

        expect(exitCode.code).equal(0);
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
            ],
            (line) => console.log(line)
        );

        const repositories = getRepositoryConfigs(POSTGRES_TYPE);

        expect(exitCode.code).equal(0);

        expect(repositories.length).equal(0);
    });
});
