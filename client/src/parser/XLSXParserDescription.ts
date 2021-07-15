import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "XLSX";
export const MIME_TYPE = "application/xlsx";

export class XLSXParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    /** Should return true if the parser implementation will support parsing the given FileStreamSummary */
    supportsFileStream(streamSummary: FileBufferSummary): boolean {
        if (streamSummary.detectedMimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
            return true;
        return streamSummary.uri.endsWith(".xlsx") || streamSummary.fileName?.toLowerCase().endsWith(".xlsx") || false;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./XLSXParser");
        return new module.XLSXParser();
    }
}
