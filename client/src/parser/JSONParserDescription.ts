import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "JSON";
export const MIME_TYPE = "application/json";

export class JSONParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./JSONParser");
        return new module.JSONParser();
    }
}
