import { ApolloClient, FetchResult, HttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client/core";
import {
    CreateMeDocument,
    CreateMeMutation,
    CreateMeMutationVariables,
    LoginDocument,
    LoginMutation,
    VerifyEmailAddressDocument,
    VerifyEmailAddressMutation
} from "./registry-client";
import fetch from "cross-fetch";
import { mailObservable } from "./setup";
import { expect } from "chai";

export function createAnonymousClient() {
    return new ApolloClient({
        cache: new InMemoryCache(),
        link: new HttpLink({ uri: "http://localhost:4000/graphql", fetch }),

        defaultOptions: {
            query: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            },
            mutate: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            },
            watchQuery: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            }
        }
    });
}

/** creates a new user, but does not verify their email */
export async function createUserDoNotVerifyEmail(
    firstName: string,
    lastName: string,
    username: string,
    emailAddress: string,
    password: string
): Promise<{
    emailVerificationToken: string;
}> {
    return new Promise(async (resolve, reject) => {
        let anonymousClient = createAnonymousClient();

        let verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });

        await anonymousClient
            .mutate<CreateMeMutation, CreateMeMutationVariables>({
                mutation: CreateMeDocument,
                variables: {
                    value: {
                        firstName: firstName,
                        lastName: lastName,
                        username: username,
                        emailAddress: emailAddress,
                        password: password
                    }
                }
            })
            .catch((error) => {
                reject(error);
            })
            .then(async (responseRaw) => {
                if (responseRaw == null) {
                    reject();
                    return;
                }

                const response = responseRaw as FetchResult<LoginMutation, Record<string, any>, Record<string, any>>;

                if (response.errors != null) {
                    reject(response);
                    return;
                }
                verifyEmailPromise
                    .catch((error) => reject(error))
                    .then((email) => {
                        expect(email.html).to.not.contain("{{registry_name}}");
                        expect(email.html).to.not.contain("{{registry_url}}");
                        expect(email.html).to.not.contain("{{token}}");
                        expect(email.html).to.not.contain("{{");

                        expect(email.text).to.not.contain("{{registry_name}}");
                        expect(email.text).to.not.contain("{{registry_url}}");
                        expect(email.text).to.not.contain("{{token}}");
                        expect(email.text).to.not.contain("{{");

                        const emailValidationToken = (email.text as String).match(/\?token=([a-zA-z0-9-]+)/);

                        resolve({
                            emailVerificationToken: emailValidationToken!.pop()!
                        });
                    });
            });
    });
}

/** creates a new user, verifies their email address, and returns an apollo client for their session */
export async function createUser(
    firstName: string,
    lastName: string,
    username: string,
    emailAddress: string,
    password: string
): Promise<ApolloClient<NormalizedCacheObject>> {
    return await new Promise(async (resolve, reject) => {
        await createUserDoNotVerifyEmail(firstName, lastName, username, emailAddress, password)
            .catch((error) => {
                reject(error);
            })
            .then((userInfo) => {
                let createUserResponse = userInfo as {
                    emailVerificationToken: string;
                };

                if (createUserResponse == undefined) return;

                createAnonymousClient()
                    .mutate({
                        mutation: VerifyEmailAddressDocument,
                        variables: {
                            token: createUserResponse.emailVerificationToken
                        }
                    })
                    .catch((error) => {
                        console.error("Error verifying email address");
                        console.error(JSON.stringify(error, null, 1));

                        reject(error);
                    })
                    .then((response) => {
                        if (response == undefined) return;

                        expect(
                            (response as FetchResult<
                                VerifyEmailAddressMutation,
                                Record<string, any>,
                                Record<string, any>
                            >).errors == null
                        ).true;

                        createAnonymousClient()
                            .mutate({
                                mutation: LoginDocument,
                                variables: {
                                    username,
                                    password
                                }
                            })
                            .catch((error) => reject(error))
                            .then((responseRaw) => {
                                const response = responseRaw as FetchResult<
                                    LoginMutation,
                                    Record<string, any>,
                                    Record<string, any>
                                >;

                                if (response.errors != null) {
                                    reject(response);
                                    return;
                                }

                                let authenticatedClient = createTestClient({
                                    Authorization: "Bearer " + response.data!.login
                                });

                                resolve(authenticatedClient);
                            });
                    });
            });
    });
}

export function createTestClient(headers: any) {
    return new ApolloClient({
        cache: new InMemoryCache(),
        defaultOptions: {
            query: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            },
            mutate: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            },
            watchQuery: {
                errorPolicy: "all",
                fetchPolicy: "no-cache"
            }
        },
        link: new HttpLink({
            uri: "http://localhost:4000/graphql",
            headers: {
                ...headers,
                Accept: "charset=utf-8"
            },
            fetch
        })
    });
}
