import { SourceDescription, Source } from "../../Source";
import { TYPE, DISPLAY_NAME } from "./BigQueryConnectorDescription";

export class BigQuerySourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("bigQuery://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./BigQuerySource");
        return new module.BigQuerySource();
    }
}
