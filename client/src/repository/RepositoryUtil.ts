import { BigQueryRepositoryDescription } from "./database/big-query/BigQueryRepositoryDescription";
import { MongoRepositoryDescripton } from "./database/mongo/MongoRepositoryDescription";
import { MySqlRepositoryDescription } from "./database/mysql/MySqlRepositoryDescription";
import { PostgresRepositoryDescription } from "./database/postgres/PostgresRepositoryDescription";
import { RedshiftRepositoryDescription } from "./database/redshift/RedshiftRepositoryDescription";
import { GoogleSheetRepositoryDescription } from "./file-based/google-sheet/GoogleSheetRepositoryDescription";
import { HTTPRepositoryDescription } from "./file-based/http/HTTPRepositoryDescription";
import { LocalFileRepositoryDescription } from "./file-based/local-file/LocalFileRepositoryDescription";
import { StandardOutRepositoryDescription } from "./file-based/standard-out/StandardOutRepositoryDescription";
import { Repository, RepositoryDescription } from "./Repository";

export const REPOSITORIES: RepositoryDescription[] = [
    new BigQueryRepositoryDescription(),
    new MongoRepositoryDescripton(),
    new MySqlRepositoryDescription(),
    new PostgresRepositoryDescription(),
    new RedshiftRepositoryDescription(),
    new GoogleSheetRepositoryDescription(),
    new HTTPRepositoryDescription(),
    new LocalFileRepositoryDescription(),
    new StandardOutRepositoryDescription()
];

/** These are never presented to the user as an option, but are available if the user knows they exist.
 * This can be used for hiding 'test' and depreciated implementations */
export const EXTENDED_REPOSITORIES: RepositoryDescription[] = REPOSITORIES.concat([]);

export function getRepositoryDescriptions(): RepositoryDescription[] {
    return REPOSITORIES.sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()));
}

export function getRepositoryDescriptionByType(type: string): RepositoryDescription | undefined {
    return EXTENDED_REPOSITORIES.find((r) => r.getType() === type);
}
