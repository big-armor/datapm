import { Repository, RepositoryDescription } from "../../Repository";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "Big Query";
export const TYPE = "googleBigQuery";

export class BigQueryRepositoryDescription implements RepositoryDescription {
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
        const repository = await import("./BigQueryRepository");
        return new repository.BigQueryRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./BigQuerySourceDescription");
        return new source.BigQuerySourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const source = await import("./BigQuerySinkDescription");
        return new source.BigQuerySinkDescription();
    }
}
