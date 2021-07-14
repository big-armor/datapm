import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "TAR";
export const MIME_TYPE = "application/tar";

export class TARParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./TARParser");
        return new module.TARParser();
    }
}
