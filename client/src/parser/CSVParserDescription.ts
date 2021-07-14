import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "Comma Separated Values (CSV)";
export const MIME_TYPE = "text/csv";

export class CSVParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./CSVParser");
        return new module.CSVParser();
    }
}
