import { Repository, RepositoryDescription } from "../../Repository";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";
import { LocalFileSinkDescription } from "./LocalFileSinkDescription";
import { LocalFileSourceDescription } from "./LocalFileSourceDescription";

export const DISPLAY_NAME = "Local File";
export const TYPE = "file";

export class LocalFileRepositoryDescription implements RepositoryDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getRepository(): Promise<Repository> {
        const repository = await import("./LocalFileRepository");
        return new repository.LocalFileRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        return new LocalFileSourceDescription();
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        return new LocalFileSinkDescription();
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return true;
    }
}
