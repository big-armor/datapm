import { Parser, ParserDescription } from "./Parser";

export const DISPLAY_NAME = "XML";
export const MIME_TYPE = "text/xml";

export class XMLParserDescription implements ParserDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    async getParser(): Promise<Parser> {
        const module = await import("./XMLParser");
        return new module.XMLParser();
    }
}
