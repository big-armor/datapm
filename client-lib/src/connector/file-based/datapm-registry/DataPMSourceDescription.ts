import { Source, SourceDescription } from "../../Source";
import { DISPLAY_NAME, TYPE } from "./DataPMConnectorDescription";

export class DataPMSourceDescription implements SourceDescription {
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
        const module = await import("./DataPMSource");
        return new module.DataPMSource();
    }
}
