import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "Comma Separated Values (CSV)";
export const MIME_TYPE = "text/csv";

export class CSVParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    public supportsFileStream(fileSummary: FileBufferSummary): boolean {
        if (
            fileSummary.detectedMimeType !== null &&
            fileSummary.detectedMimeType !== "text/csv" &&
            fileSummary.detectedMimeType !== "text/plain"
        )
            return false;
        return (
            fileSummary.detectedMimeType === "text/csv" ||
            fileSummary.reportedMimeType === "text/csv" ||
            fileSummary.fileName?.endsWith("csv") ||
            false
        );
    }

    async getParser(): Promise<Parser> {
        const module = await import("./CSVParser");
        return new module.CSVParser();
    }
}
