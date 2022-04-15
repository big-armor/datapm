import { Source, SourceDescription } from "../Source";
import { DISPLAY_NAME, TYPE, URI_BASE } from "./GeminiConnectorDescription";

export class GeminiSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith(URI_BASE);
    }

    async getSource(): Promise<Source> {
        const source = await import("./GeminiSource");
        return new source.GeminiSource();
    }
}
