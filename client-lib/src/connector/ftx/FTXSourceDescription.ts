import { Source, SourceDescription } from "../Source";
import { DISPLAY_NAME, TYPE, URI, URI_US } from "./FTXConnectorDescription";

export class FTXSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): false {
        return false;
    }

    async getSource(): Promise<Source> {
        const source = await import("./FTXSource");
        return new source.FTXSource();
    }
}
