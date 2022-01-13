import { Source, SourceDescription } from "../../Source";
import { DISPLAY_NAME, TYPE } from "./DataPMRepositoryDescription";

export class DataPMSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.indexOf("http://") === 0 || uri.indexOf("https://") === 0;
    }

    getSource(): Promise<Source> {
        throw new Error("Method not implemented.");
    }
}
