import { FileBufferSummary, Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "AVRO";
export const MIME_TYPE = "application/avro";

export class AVROParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    /** Should return true if the parser implementation will support parsing the given FileStreamSummary */
    supportsFileStream(streamSummary: FileBufferSummary): boolean {
        const firstFourBytes = streamSummary.buffer.toString("ascii", 0, 4);

        if (firstFourBytes === "Obj" + String.fromCharCode(1)) return true;
        return streamSummary.uri.endsWith(".avro") || streamSummary.fileName?.toLowerCase().endsWith(".avro") || false;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./AVROParser");
        return new module.AVROParser();
    }
}
