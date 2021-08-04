import { SourceDescription, Source } from "../../../repository/Source";
import { TYPE, DISPLAY_NAME } from "./HTTPRepositoryDescription";
export class HTTPSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("http://") || uri.startsWith("https://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./HTTPSource");
        return new module.HTTPSource();
    }
}
