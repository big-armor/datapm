import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "XLSX";
export const MIME_TYPE = "application/xlsx";

export class XLSXParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./XLSXParser");
        return new module.XLSXParser();
    }
}
