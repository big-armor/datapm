import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { Apollo, APOLLO_OPTIONS } from "apollo-angular";
import { HttpLink } from "apollo-angular/http";
import { InMemoryCache, ApolloLink } from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { getTokenDesc } from "graphql/language/lexer";
import { onError } from "@apollo/client/link/error";
import JwtDecode from "jwt-decode";
const uri = "/graphql";

export function provideApollo(httpLink: HttpLink) {
    const basic = setContext((operation, context) => ({
        headers: {
            Accept: "charset=utf-8"
        }
    }));

    // Get the authentication token from local storage if it exists

    const getHeaders = () => {
        const token = localStorage.getItem("jwt");

        if (token == null) return {};

        const tokenData = JwtDecode<{ exp: number }>(token);

        if (tokenData) {
            const date = new Date(tokenData.exp * 1000);
            const currentDate = new Date();

            if (date.getTime() < currentDate.getTime()) {
                localStorage.removeItem("jwt");
                return {};
            }
        }

        return {
            Authorization: `Bearer ${token}`
        };
    };

    const auth = setContext((operation, context) => ({
        headers: getHeaders()
    }));

    const errorLink = onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors)
            graphQLErrors.map(({ message, locations, path }) =>
                console.log(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`)
            );

        if (networkError) console.log(`[Network error]: ${networkError}`);
    });

    const link = ApolloLink.from([basic, auth, httpLink.create({ uri }), errorLink]);
    const cache = new InMemoryCache();

    return {
        link,
        cache,
        defaultOptions: {
            query: {
                fetchPolicy: "no-cache",
                errorPolicy: "all"
            },
            watchQuery: {
                fetchPolicy: "no-cache",
                errorPolicy: "all"
            },
            mutate: {
                fetchPolicy: "no-cache",
                errorPolicy: "all"
            }
        }
    };
}

@NgModule({
    exports: [HttpClientModule],
    providers: [
        {
            provide: APOLLO_OPTIONS,
            useFactory: provideApollo,
            deps: [HttpLink]
        }
    ]
})
export class GraphQLModule {}
