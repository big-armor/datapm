import { Collection } from "src/generated/graphql";

export interface CollectionsResponse {
    collections?: Collection[];
    hasMore?: boolean;
    errors?: string[];
    shouldResetCollection?: boolean;
}
