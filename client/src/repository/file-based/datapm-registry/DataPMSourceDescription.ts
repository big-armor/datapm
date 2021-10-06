import { SourceDescription, Source } from "../../Source";
import { TYPE, DISPLAY_NAME } from "./DataPMRepositoryDescription";
export class DataPMSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("datapm://") || uri.startsWith("datapms://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./DataPMSource");
        return new module.DataPMSource();
    }
}
