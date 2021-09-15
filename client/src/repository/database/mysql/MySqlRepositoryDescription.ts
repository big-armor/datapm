import { Repository, RepositoryDescription } from "../../Repository";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "MySQL";
export const TYPE = "mysql";

export class MySqlRepositoryDescription implements RepositoryDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getRepository(): Promise<Repository> {
        const repository = await import("./MySqlRepository");
        return new repository.MySqlRepository();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        return null;
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const repository = await import("./MySqlSinkDescription");
        return new repository.MySqlSinkDescription();
    }

    hasSource(): boolean {
        return false;
    }

    hasSink(): boolean {
        return true;
    }
}
