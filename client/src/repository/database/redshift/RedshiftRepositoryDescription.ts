import { Repository, RepositoryDescription } from "../../Repository";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "PostgreSQL";
export const TYPE = "postgres";

export class RedshiftRepositoryDescription implements RepositoryDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getRepository(): Promise<Repository> {
        const repository = await import("./RedshiftRepository");
        return new repository.RedshiftRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const repository = await import("./RedshiftSourceDescription");
        return new repository.RedshiftSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const repository = await import("./RedshiftSinkDescription");
        return new repository.RedshiftSinkDescription();
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return true;
    }
}
