import { describe, it } from "mocha";
import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { createAnonymousClient, createUser } from "./test-utils";
import { expect } from "chai";
import { CreateCredentialDocument, CreatePackageDocument, ListCredentialsDocument } from "./registry-client";

describe("Credentials", ()=> {

    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousUser = createAnonymousClient();
    
    before(async ()=> {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-credentials",
            "testA-credentials@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-credentials",
            "testB-credentials@test.datapm.io",
            "passwordB!"
        );

        let response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test",
                    displayName: "Credentials Test",
                    description: "Testing credentials"
                }
            }
        });

        expect(response.errors == null).true;
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    })

    it("should not allow user without package edit permission to create credentials", async () => {

        const response = await userBClient.query({
            query: CreateCredentialDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test",
                },
                sourceType: "test",
                sourceSlug: "test",
                credentialIdentifier: "test-user",
                credential: {
                    somethingSomething: "darkSide"
                }
            }
        });

        expect(response.errors).not.equal(null);

    });

    it("should create credential", async () => {

        const response = await userAClient.mutate({
            mutation: CreateCredentialDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test",
                },
                sourceType: "testType",
                sourceSlug: "testSlug",
                credentialIdentifier: "test-user",
                credential: {
                    somethingSomething: "darkSide"
                }
            }
        });

        expect(response.errors).equal(undefined);

        expect(response.data?.createCredential.sourceType).equal("testType");
        expect(response.data?.createCredential.sourceSlug).equal("testSlug");
        expect(response.data?.createCredential.credentialIdentifier).equal("test-user");

        expect(response.data?.createCredential.creator?.username).equal("testA-credentials");

    });

    it("Should not allow user without access to list credentials", async () => {

        const response = await userBClient.query({
            query: ListCredentialsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test",
                },
                limit: 100,
                offset: 0
            }
        });

        expect(response.errors?.length).equal(1);
    });

    it("Should list credentials", async () => {

        const response = await userAClient.query({
            query: ListCredentialsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test",
                },
                limit: 100,
                offset: 0
            }
        });

        expect(response.errors).equal(undefined);

        const credential = response.data.listCredentials.credentials![0];
        
        expect(credential.sourceType).equal("testType");
        expect(credential.sourceSlug).equal("testSlug");
        expect(credential.credentialIdentifier).equal("test-user");
        expect(credential.creator?.username).equal("testA-credentials");
    });
})