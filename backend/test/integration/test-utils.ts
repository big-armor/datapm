import { ApolloClient, FetchResult, HttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client/core";
import {
    CreateAPIKeyDocument,
    CreateMeDocument,
    CreateMeMutation,
    CreateMeMutationVariables,
    LoginDocument,
    LoginMutation,
    MeDocument,
    Scope,
    VerifyEmailAddressDocument,
    VerifyEmailAddressMutation
} from "./registry-client";
import fetch from "cross-fetch";
import { MailDevEmail, mailObservable } from "./setup";
import { expect } from "chai";
import { io, Socket } from "socket.io-client";
import { SocketEvent, TimeoutPromise, createAPIKeyFromParts } from "datapm-lib";

export function createAnonymousClient(): ApolloClient<NormalizedCacheObject> {
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
    password: string,
    uiDarkModeEnabled?: boolean
): Promise<{
    emailVerificationToken: string;
}> {
    const anonymousClient = createAnonymousClient();

    const emails: MailDevEmail[] = [];
    const subscription = mailObservable.subscribe((email) => {
        emails.push(email);
    });

    const responseRaw = await anonymousClient.mutate<CreateMeMutation, CreateMeMutationVariables>({
        mutation: CreateMeDocument,
        variables: {
            value: {
                firstName: firstName,
                lastName: lastName,
                username: username,
                emailAddress: emailAddress,
                password: password,
                uiDarkModeEnabled: uiDarkModeEnabled
            }
        }
    });

    if (responseRaw == null) {
        throw new Error();
    }

    const response = responseRaw as FetchResult;

    if (response.errors != null) {
        throw new Error(response.errors[0].message);
    }

    do {
        const email = emails.find((email) => email.to[0].address === emailAddress);

        if (email == null) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
        }

        expect(email.html).to.not.contain("{{registry_name}}");
        expect(email.html).to.not.contain("{{registry_url}}");
        expect(email.html).to.not.contain("{{token}}");
        expect(email.html).to.not.contain("{{");

        expect(email.text).to.not.contain("{{registry_name}}");
        expect(email.text).to.not.contain("{{registry_url}}");
        expect(email.text).to.not.contain("{{token}}");
        expect(email.text).to.not.contain("{{");

        const emailValidationToken = (email.text as string).match(/\?token=([a-zA-z0-9-]+)/)?.pop();

        if (emailValidationToken == null) {
            throw new Error("Could not find email validation token in email");
        }

        return {
            emailVerificationToken: emailValidationToken
        };

        break;
    } while (true);

    subscription.unsubscribe();
}

/** creates a new user, verifies their email address, and returns an apollo client for their session */
export async function createUser(
    firstName: string,
    lastName: string,
    username: string,
    emailAddress: string,
    password: string,
    uiDarkModeEnabled?: boolean
): Promise<ApolloClient<NormalizedCacheObject>> {
    const userInfo = await createUserDoNotVerifyEmail(
        firstName,
        lastName,
        username,
        emailAddress,
        password,
        uiDarkModeEnabled
    );

    const createUserResponse = userInfo;

    if (createUserResponse === undefined) {
        throw new Error("Unable to create user");
    }

    try {
        const response = await createAnonymousClient().mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: createUserResponse.emailVerificationToken
            }
        });

        expect(
            (response as FetchResult<VerifyEmailAddressMutation, Record<string, unknown>, Record<string, unknown>>)
                .errors == null
        ).to.equal(true);

        const authenticatedClient = createAuthenticatedClient(username, password);
        return authenticatedClient;
    } catch (error) {
        console.error("Error verifying email address");
        console.error(JSON.stringify(error, null, 1));

        throw error;
    }
}

export async function createAuthenticatedClient(
    username: string,
    password: string
): Promise<ApolloClient<NormalizedCacheObject>> {
    const responseRaw = await createAnonymousClient().mutate({
        mutation: LoginDocument,
        variables: {
            username,
            password
        }
    });

    const response = responseRaw as FetchResult;

    if (response.errors != null) {
        throw new Error(JSON.stringify(response.errors));
    }

    const authenticatedClient = createTestClient({
        Authorization: "Bearer " + response.data?.login
    });

    return authenticatedClient;
}

export function createTestClient(headers: { [key: string]: string }): ApolloClient<NormalizedCacheObject> {
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

export async function createAnonymousStreamingClient(): Promise<Socket> {
    const socket = io("http://localhost:4000", {
        path: "/ws/",
        parser: require("socket.io-msgpack-parser"),
        transports: ["polling", "websocket"]
    });

    return new TimeoutPromise<Socket>(5000, (resolve) => {
        socket.once("connect", async () => {
            socket.once(SocketEvent.READY.toString(), () => {
                resolve(socket);
            });
        });
    });
}

export async function createAuthenicatedStreamingClient(username: string, password: string): Promise<Socket> {
    const authenticatedClient = await createAuthenticatedClient(username, password);

    const response = await authenticatedClient.mutate({
        mutation: CreateAPIKeyDocument,
        variables: {
            value: {
                label: "test-" + new Date().getTime().toString(),
                scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
            }
        }
    });

    if (response.data?.createAPIKey.id === undefined) {
        throw new Error("Unable to create API key");
    }

    const apiKey = createAPIKeyFromParts(response.data?.createAPIKey.id, response.data?.createAPIKey.secret);

    const socket = io("http://localhost:4000", {
        path: "/ws/",
        parser: require("socket.io-msgpack-parser"),
        transports: ["polling", "websocket"],
        auth: {
            token: apiKey
        }
    });

    return new TimeoutPromise<Socket>(5000, (resolve, reject) => {
        socket.once("connect", async () => {
            socket.once(SocketEvent.READY.toString(), () => {
                resolve(socket);
            });
        });

        socket.on("connect_error", (error) => {
            console.error(error);
            reject(error);
        });
    });
}
