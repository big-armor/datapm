import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "TAR";
export const MIME_TYPE = "application/tar";
export const MIME_TYPES = ["application/tar"];
export const EXTENSIONS = ["tar"];

export class TARParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    getSupportedMimeTypes(): string[] {
        return MIME_TYPES;
    }

    getFileExtensions(): string[] {
        return EXTENSIONS;
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
        const module = await import("./TARParser");
        return new module.TARParser();
    }
}
