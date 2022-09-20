import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { AdminHolder } from "./admin-holder";
import { createUser } from "./test-utils";

describe("User Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    it("Create user", async function () {
        userAClient = await createUser("FirstA", "LastA", "testA-case", "testA-case@test.datapm.io", "passwordA!");

        expect(userAClient).to.not.equal(undefined);
    });

    it("Do not allow a new user with the same email in different case", async function () {
        let errorFound: Error | null = null;

        try {
            await createUser("FirstA", "LastA", "testA-case2", "testa-case@test.datapm.io", "passwordA!");
        } catch (error) {
            errorFound = error;
        }

        expect(errorFound).to.not.equal(null);

        expect(errorFound?.message).to.include("EMAIL_ADDRESS_NOT_AVAILABLE");
    });

    it("Do not allow a new user with the same username in different case", async function () {
        let errorFound: Error | null = null;

        try {
            await createUser("FirstA", "LastA", "testa-case", "testa-case2@test.datapm.io", "passwordA!");
        } catch (error) {
            errorFound = error;
        }

        expect(errorFound).to.not.equal(null);

        expect(errorFound?.message).to.include("USERNAME_NOT_AVAILABLE");
    });
});
