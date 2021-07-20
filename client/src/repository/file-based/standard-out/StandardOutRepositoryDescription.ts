import { Repository, RepositoryDescription } from "../../Repository";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "Console (Standard Out)";
export const TYPE = "stdout";

export class StandardOutRepositoryDescription implements RepositoryDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getRepository(): Promise<Repository> {
        const repository = await import("./StandardOutRepository");
        return new repository.StandardOutRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        return null;
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const repository = await import("./StandardOutSinkDescription");
        return new repository.StandardOutSinkDescription();
    }

    hasSource(): boolean {
        return false;
    }

    hasSink(): boolean {
        return true;
    }
}
