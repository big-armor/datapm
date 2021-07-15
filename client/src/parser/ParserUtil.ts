import { Maybe } from "../util/Maybe";

import { FileBufferSummary, Parser, ParserDescription } from "./Parser";
import { CSVParserDescription } from "./CSVParserDescription";
import { XMLParserDescription } from "./XMLParserDescription";
import { JSONParserDescription } from "./JSONParserDescription";
import { AVROParserDescription } from "./AVROParserDescription";
import { XLSXParserDescription } from "./XLSXParserDescription";
import { GZipParserDescription } from "./GZipParserDescription";
import { BZip2ParserDescription } from "./BZip2ParserDescription";
import { TARParserDescription } from "./TARParserDescription";
import { ZIPParserDescription } from "./ZIPParserDescription";

export function getParsers(): ParserDescription[] {
    return [
        new CSVParserDescription(),
        new XMLParserDescription(),
        new JSONParserDescription(),
        new AVROParserDescription(),
        new XLSXParserDescription(),
        new GZipParserDescription(),
        new BZip2ParserDescription(),
        new ZIPParserDescription(),
        new TARParserDescription()
    ];
}

export async function getParser(streamSummary: FileBufferSummary): Promise<Maybe<Parser>> {
    const parserDescriptions = getParsers();

    for (const parserDescription of parserDescriptions) {
        if (parserDescription.supportsFileStream(streamSummary)) {
            const parser = await parserDescription.getParser();
            return parser;
        }
    }

    return null;
}

export async function getParserByMimeType(mimeType: string): Promise<Maybe<Parser>> {
    const parserDescriptions = getParsers();

    for (const parserDescription of parserDescriptions) {
        if (parserDescription.getMimeType() === mimeType) {
            return parserDescription.getParser();
        }
    }

    return null;
}
