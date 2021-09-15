import { Repository, RepositoryDescription } from "../Repository";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const DISPLAY_NAME = "Stream Test";
export const TYPE = "test";

export class StreamTestRepositoryDescription implements RepositoryDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getRepository(): Promise<Repository> {
        const source = await import("./StreamTestRepository");
        return new source.StreamTestRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const source = await import("./StreamTestSourceDescription");
        return new source.StreamTestSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        return null;
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return false;
    }
}
