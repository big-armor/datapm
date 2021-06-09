import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";

export class AdminHolder {
    public static adminClient: ApolloClient<NormalizedCacheObject>;
    public static adminUsername: string;
}
