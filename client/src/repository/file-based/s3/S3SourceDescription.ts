import { SourceDescription, Source } from "../../../repository/Source";
import { TYPE, DISPLAY_NAME } from "./S3RepositoryDescription";
export class S3SourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("s3://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./S3Source");
        return new module.S3Source();
    }
}
