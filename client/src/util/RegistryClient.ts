import { ApolloClient, ApolloLink, HttpLink, InMemoryCache, NormalizedCacheObject } from "@apollo/client/core";
import fetch from "cross-fetch";

export function createRegistryClient(url: string, jwt: string | undefined): ApolloClient<NormalizedCacheObject> {
    const headers: { [key: string]: string } = {
        Accept: "charset=utf-8"
    };

    if (jwt) {
        headers.Authorization = "Bearer " + jwt;
    }

    const httpLink = new HttpLink({
        fetch: (fetch as unknown) as WindowOrWorkerGlobalScope["fetch"],
        headers,
        uri: `${url}/graphql`
    });

    return new ApolloClient({
        link: ApolloLink.from([httpLink]),
        cache: new InMemoryCache(),

        defaultOptions: {
            mutate: {
                errorPolicy: "all"
            },
            query: {
                errorPolicy: "all"
            },
            watchQuery: {
                errorPolicy: "all"
            }
        }
    });
}
