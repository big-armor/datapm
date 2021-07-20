import { Repository, RepositoryDescription } from "./Repository";

export const REPOSITORIES: RepositoryDescription[] = [];

/** These are never presented to the user as an option, but are available if the user knows they exist.
 * This can be used for hiding 'test' and depreciated implementations */
export const EXTENDED_REPOSITORIES: RepositoryDescription[] = REPOSITORIES.concat([]);

export function getRepositoryDescriptions(): RepositoryDescription[] {
    return REPOSITORIES.sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()));
}

export function getRepositoryByType(type: string): Promise<Repository> | undefined {
    return EXTENDED_REPOSITORIES.find((r) => r.getType() === type)?.getRepository();
}
