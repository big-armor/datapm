import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "JSON";
export const MIME_TYPE = "application/json";

export class JSONParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    /** Should return true if the parser implementation will support parsing the given FileStreamSummary */
    supportsFileStream(streamSummary: FileBufferSummary): boolean {
        if (
            streamSummary.detectedMimeType !== null &&
            streamSummary.detectedMimeType !== "application/json" &&
            streamSummary.detectedMimeType !== "text/plain"
        )
            return false;
        return (
            streamSummary.uri.endsWith(".json") ||
            streamSummary.detectedMimeType === "application/json" ||
            streamSummary.reportedMimeType === "application/json" ||
            streamSummary.fileName?.toLowerCase().endsWith(".json") ||
            false
        );
    }

    async getParser(): Promise<Parser> {
        const module = await import("./JSONParser");
        return new module.JSONParser();
    }
}
