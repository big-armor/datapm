import { SourceDescription, Source } from "../repository/Source";
export const TYPE = "test";

export class StreamTestSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("test://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./StreamTestSource");
        return new module.StreamTestSource();
    }
}
