import { Repository, RepositoryDescription } from "../../Repository";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "PostgreSQL";
export const TYPE = "postgres";

export class PostgresRepositoryDescription implements RepositoryDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return true;
    }

    async getRepository(): Promise<Repository> {
        const repository = await import("./PostgresRepository");
        return new repository.PostgresRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./PostgresSourceDescription");
        return new source.PostgresSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const source = await import("./PostgresSinkDescription");
        return new source.PostgresSinkDescription();
    }
}
