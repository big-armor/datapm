import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "ZIP";
export const MIME_TYPE = "application/zip";

export class ZIPParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./ZIPParser");
        return new module.ZIPParser();
    }
}
