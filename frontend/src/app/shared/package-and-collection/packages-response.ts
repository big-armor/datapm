import { Package } from "src/generated/graphql";

export interface PackagesResponse {
    packages: Package[];
    hasMore: boolean;
}
