import { SourceDescription, SourceInterface } from "./Source";
export const TYPE = "s3";

export class S3SourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("s3://");
    }

    async getSource(): Promise<SourceInterface> {
        const module = await import("./S3Source");
        return new module.S3Source();
    }
}
