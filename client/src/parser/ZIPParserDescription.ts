import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "ZIP";
export const MIME_TYPE = "application/zip";
export const MIME_TYPES = ["application/zip"];
export const EXTENSIONS = ["zip"];

export class ZIPParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    getFileExtensions(): string[] {
        return EXTENSIONS;
    }

    getSupportedMimeTypes(): string[] {
        return MIME_TYPES;
    }

    /** Should return true if the parser implementation will support parsing the given FileStreamSummary */
    supportsFileStream(streamSummary: FileBufferSummary): boolean {
        if (
            streamSummary.detectedMimeType != null &&
            this.getSupportedMimeTypes().includes(streamSummary.detectedMimeType)
        )
            return true;

        if (this.getFileExtensions().find((e) => streamSummary.fileName?.endsWith("." + e)) != null) return true;

        return false;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./ZIPParser");
        return new module.ZIPParser();
    }
}
