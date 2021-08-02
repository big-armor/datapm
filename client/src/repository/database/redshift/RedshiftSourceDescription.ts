import { SourceDescription, Source } from "../../../repository/Source";
import { TYPE } from "./RedshiftRepositoryDescription";

export class RedshiftSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("redshift://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./RedshiftSource");
        return new module.RedshiftSource();
    }
}
