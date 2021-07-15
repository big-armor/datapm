import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "BZip2";
export const MIME_TYPE = "application/bzip2";
export const MIME_TYPES = ["application/bzip2", "application/x-bzip2"];
export const FILE_EXTENSIONS = ["bzip2", "bz2"];
export class BZip2ParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    getFileExtensions(): string[] {
        return FILE_EXTENSIONS;
    }

    supportsFileStream(streamSummary: FileBufferSummary): boolean {
        if (streamSummary.detectedMimeType != null && MIME_TYPES.includes(streamSummary.detectedMimeType)) return true;

        if (this.getFileExtensions().find((e) => streamSummary.fileName?.endsWith("." + e)) != null) return true;

        return false;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./BZip2Parser");
        return new module.BZip2Parser();
    }
}
