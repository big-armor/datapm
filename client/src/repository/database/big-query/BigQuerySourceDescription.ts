import { SourceDescription, Source } from "../../Source";
import { TYPE } from "./BigQueryRepositoryDescription";

export class BigQuerySourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("bigQuery://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./BigQuerySource");
        return new module.BigQuerySource();
    }
}
