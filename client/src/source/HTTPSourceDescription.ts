import { SourceDescription, SourceInterface } from "./Source";

export const TYPE = "http";

export class HTTPSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("http://") || uri.startsWith("https://");
    }

    async getSource(): Promise<SourceInterface> {
        const module = await import("./HTTPSource");
        return new module.HTTPSource();
    }
}
