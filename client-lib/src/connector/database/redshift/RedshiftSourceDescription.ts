import { SourceDescription, Source } from "../../../connector/Source";
import { TYPE, DISPLAY_NAME } from "./RedshiftConnectorDescription";

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
