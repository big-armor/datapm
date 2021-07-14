import { SourceDescription, SourceInterface } from "./Source";

export const TYPE = "googleBigQuery";

export class BigQuerySourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("bigQuery://");
    }

    async getSource(): Promise<SourceInterface> {
        const module = await import("./BigQuerySource");
        return new module.BigQuerySource();
    }
}
