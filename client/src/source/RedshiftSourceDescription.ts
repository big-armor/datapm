import { SourceDescription, SourceInterface } from "./Source";
export const TYPE = "redshift";

export class RedshiftSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("redshift://");
    }

    async getSource(): Promise<SourceInterface> {
        const module = await import("./RedshiftSource");
        return new module.RedshiftSource();
    }
}
