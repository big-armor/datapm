import { SourceDescription, Source } from "../../../repository/Source";

export const TYPE = "http";

export class HTTPSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("http://") || uri.startsWith("https://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./HTTPSource");
        return new module.HTTPSource();
    }
}
