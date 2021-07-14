import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "BZip2";
export const MIME_TYPE = "application/bzip2";

export class BZip2ParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./BZip2Parser");
        return new module.BZip2Parser();
    }
}
