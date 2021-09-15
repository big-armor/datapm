import { Repository, RepositoryDescription } from "../../Repository";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "AWS S3";
export const TYPE = "s3";

export class S3RepositoryDescription implements RepositoryDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getRepository(): Promise<Repository> {
        const repository = await import("./S3Repository");
        return new repository.S3Repository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const repository = await import("./S3SourceDescription");
        return new repository.S3SourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const repository = await import("./S3SinkDescription");
        return new repository.S3SinkDescription();
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return true;
    }
}
