import { Repository, RepositoryDescription } from "../../Repository";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "MongoDB";
export const TYPE = "mongo";
export class MongoRepositoryDescripton implements RepositoryDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getRepository(): Promise<Repository> {
        const module = await import("./MongoRepository");
        return new module.MongoRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        return null;
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const repository = await import("./MongoSinkDescription");
        return new repository.MongoSinkDescription();
    }

    hasSource(): boolean {
        return false;
    }

    hasSink(): boolean {
        return true;
    }
}
