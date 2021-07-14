import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "AVRO";
export const MIME_TYPE = "application/avro";

export class AVROParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./AVROParser");
        return new module.AVROParser();
    }
}
