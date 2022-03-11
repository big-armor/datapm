import { SourceDescription, Source } from "../../connector/Source";
import { TYPE, DISPLAY_NAME } from "./StreamTestConnectorDescription";

export class StreamTestSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("test://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./StreamTestSource");
        return new module.StreamTestSource();
    }
}
