import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "GZip";
export const MIME_TYPE = "application/gzip";

export class GZipParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./GZipParser");
        return new module.GZipParser();
    }
}
