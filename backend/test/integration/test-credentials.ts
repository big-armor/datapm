import { describe, it } from "mocha";
import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { createAnonymousClient, createUser } from "./test-utils";
import { expect } from "chai";
import {
    CreateCredentialDocument,
    CreatePackageDocument,
    CreateRepositoryDocument,
    DeleteCredentialDocument,
    DeleteRepositoryDocument,
    ListRepositoriesDocument,
    Permission,
    SetPackagePermissionsDocument
} from "./registry-client";

describe("Credentials", () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousUser = createAnonymousClient();

    before(async () => {
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

        const response = await userAClient.mutate({
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

        expect(response.errors == null).equal(true);
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Should not allow user without package edit permission to create repositories", async () => {
        const response = await userBClient.mutate({
            mutation: CreateRepositoryDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                connectorType: "test-connector",
                repositoryIdentifier: "test-repository",
                connectionConfiguration: {
                    test: "test"
                }
            }
        });

        expect(response.errors).not.equal(null);
    });

    it("Should create repository", async () => {
        const response = await userAClient.mutate({
            mutation: CreateRepositoryDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                connectorType: "test-connector",
                repositoryIdentifier: "test-repository",
                connectionConfiguration: {
                    test: "test"
                }
            }
        });

        expect(response.errors).equal(undefined);

        expect(response.data?.createRepository.repositoryIdentifier).equal("test-repository");
        expect(response.data?.createRepository.connectorType).equal("test-connector");
    });

    it("should not allow user without package edit permission to create credentials", async () => {
        const response = await userBClient.mutate({
            mutation: CreateCredentialDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                connectorType: "test",
                repositoryIdentifier: "test",
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
                    packageSlug: "credentials-test"
                },
                connectorType: "test-connector",
                repositoryIdentifier: "test-repository",
                credentialIdentifier: "test-user",
                credential: {
                    somethingSomething: "darkSide"
                }
            }
        });

        expect(response.errors).equal(undefined);

        expect(response.data?.createCredential.credentialIdentifier).equal("test-user");

        expect(response.data?.createCredential.creator?.username).equal("testA-credentials");
    });

    it("Should not allow user without access to list repositories", async () => {
        const response = await userBClient.query({
            query: ListRepositoriesDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                limit: 100,
                offset: 0
            }
        });

        expect(response.errors?.length).equal(1);
    });

    it("Should list repositories", async () => {
        const response = await userAClient.query({
            query: ListRepositoriesDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                limit: 100,
                offset: 0
            }
        });

        expect(response.errors).equal(undefined);

        if (response.data.listRepositories.repositories == null) throw new Error("Repositories is null");

        const repository = response.data.listRepositories.repositories[0];

        expect(repository.connectorType).equal("test-connector");
        expect(repository.repositoryIdentifier).equal("test-repository");
        expect(repository.creator?.username).equal("testA-credentials");

        if (repository.credentials == null) throw new Error("Credentials is null");

        const credential = repository.credentials[0];

        expect(credential.credentialIdentifier).equal("test-user");
        expect(credential.creator?.username).equal("testA-credentials");
    });

    it("Should give userB package view access", async () => {
        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                value: {
                    permissions: [Permission.VIEW],
                    usernameOrEmailAddress: "testB-credentials"
                },
                message: "none"
            }
        });

        expect(response.errors).equal(undefined);
    });

    it("Should now allow user with VIEW permission to list repositories", async () => {
        const response = await userBClient.query({
            query: ListRepositoriesDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                limit: 100,
                offset: 0
            }
        });

        if (response.errors == null) throw new Error("Expected errors");

        expect(response.errors.length).equal(1);
    });

    it("Should not allow credential deleting by user without access", async () => {
        const response = await userBClient.mutate({
            mutation: DeleteCredentialDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                connectorType: "test-connector",
                repositoryIdentifier: "test-repository",
                credentialIdentifier: "test-user"
            }
        });

        expect(response.errors).not.equal(null);
    });

    it("Should delete credential", async () => {
        const response = await userAClient.mutate({
            mutation: DeleteCredentialDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                connectorType: "test-connector",
                repositoryIdentifier: "test-repository",
                credentialIdentifier: "test-user"
            }
        });

        expect(response.errors).equal(undefined);
    });

    it("Should not list credential after deleting", async () => {
        const response = await userAClient.query({
            query: ListRepositoriesDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                limit: 100,
                offset: 0
            }
        });

        expect(response.errors).equal(undefined);

        if (response.data.listRepositories.repositories == null) throw new Error("Repositories is null");
        expect(response.data.listRepositories.repositories[0].credentials?.length).equal(0);
    });

    it("Should not allow repository deleting by user without access", async () => {
        const response = await userBClient.mutate({
            mutation: DeleteRepositoryDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                connectorType: "test-connector",
                repositoryIdentifier: "test-repository"
            }
        });

        expect(response.errors).not.equal(null);
    });

    it("Should delete repository", async () => {
        const response = await userAClient.mutate({
            mutation: DeleteRepositoryDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                connectorType: "test-connector",
                repositoryIdentifier: "test-repository"
            }
        });

        expect(response.errors).equal(undefined);
    });

    it("Should not list repository after deleting", async () => {
        const response = await userAClient.query({
            query: ListRepositoriesDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-credentials",
                    packageSlug: "credentials-test"
                },
                limit: 100,
                offset: 0
            }
        });

        expect(response.errors).equal(undefined);

        expect(response.data.listRepositories.repositories?.length).equal(0);
    });
});
