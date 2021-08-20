import { SourceDescription, Source } from "../../../repository/Source";
import { TYPE, DISPLAY_NAME } from "./RedshiftRepositoryDescription";

export class RedshiftSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("redshift://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./RedshiftSource");
        return new module.RedshiftSource();
    }
}
