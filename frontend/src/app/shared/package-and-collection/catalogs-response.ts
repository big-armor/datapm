import { Catalog } from "src/generated/graphql";

export interface CatalogsResponse {
    catalogs?: Catalog[];
    hasMore?: boolean;
    errors?: string[];
    shouldResetCatalogs?: boolean;
}
