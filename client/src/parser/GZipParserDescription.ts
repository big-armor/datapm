import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "GZip";
export const MIME_TYPE = "application/gzip";
export const FILE_EXTENSIONS = ["gzip", "gz"];
export const MIME_TYPES = ["application/gzip", "application/x-gzip"];
export class GZipParserDescription implements ParserDescription {
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
        const module = await import("./GZipParser");
        return new module.GZipParser();
    }
}
