import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "XML";
export const MIME_TYPE = "text/xml";

export class XMLParserDescription implements ParserDescription {
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
            streamSummary.detectedMimeType !== "text/xml" &&
            streamSummary.detectedMimeType !== "application/xml"
        )
            return false;
        return (
            streamSummary.detectedMimeType === "text/xml" ||
            streamSummary.detectedMimeType === "application/xml" ||
            streamSummary.reportedMimeType === "text/xml" ||
            streamSummary.reportedMimeType === "application/xml" ||
            streamSummary.fileName?.toLowerCase().endsWith(".xml") ||
            streamSummary.uri?.toLowerCase().endsWith(".xml") ||
            false
        );
    }

    async getParser(): Promise<Parser> {
        const module = await import("./XMLParser");
        return new module.XMLParser();
    }
}
