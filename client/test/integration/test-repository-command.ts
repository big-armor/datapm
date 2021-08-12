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
            ],
            (line) => console.log(line)
        );

        const repositories = getRepositoryConfigs(POSTGRES_TYPE);

        expect(repositories.length).equal(1);
        expect(repositories[0].connectionConfiguration.host).equal(`testhost`);
        expect(repositories[0].connectionConfiguration.port).equal(`999`);
        expect((repositories[0].crdentials as RepositoryCredentialsConfig[])[0].identifier).equal(`postgres`);
        expect((repositories[0].crdentials as RepositoryCredentialsConfig[])[1].identifier).equal(`postgres2`);
    });
});
