import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { Apollo, APOLLO_OPTIONS } from "apollo-angular";
import { HttpLink } from "apollo-angular/http";
import { InMemoryCache, ApolloLink } from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { withScalars } from "apollo-link-scalars";
import { onError } from "@apollo/client/link/error";
import JwtDecode from "jwt-decode";
import { typeDefs } from "../generated/graphql";
import { GraphQLScalarType, GraphQLSchema, Kind } from "graphql";
import { makeExecutableSchema } from "@graphql-tools/schema";
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

    const typesMap = {
        Date: {
            serialize: (date: Date) => date.toString(),
            parseValue: (raw: string | null): Date | null => {
                return raw ? new Date(Date.parse(raw)) : null;
            }
        }
    };

    const resolvers = {
        // example of scalar type, which will parse the string into a custom class CustomDate which receives a Date object
        Date: new GraphQLScalarType({
            name: "Date",
            serialize: (parsed: Date | null) => parsed && parsed.toISOString(),
            parseValue: (raw: any) => raw && new Date(Date.parse(raw))
            /*parseLiteral(ast) {
                if (ast.kind === Kind.STRING || ast.kind === Kind.INT) {
                    return new new Date(Date.parse(ast.value))();
                }
                return null;
            }*/
        })
    };

    // GraphQL Schema, required to use the link
    const schema = makeExecutableSchema({
        typeDefs,
        resolvers
    });

    const link = ApolloLink.from([
        withScalars({
            schema,
            typesMap
        }),
        basic,
        auth,
        httpLink.create({ uri }),
        errorLink
    ]);
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
