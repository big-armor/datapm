import { Maybe } from "../util/Maybe";

import { BZip2Parser } from "./BZip2Parser";
import { CSVParser } from "./CSVParser";
import { GZipParser } from "./GZipParser";
import { JSONParser } from "./JSONParser";
import { XMLParser } from "./XMLParser";
import { AVROParser } from "./AVROParser";
import { XLSXParser } from "./XLSXParser";
import { ZIPParser } from "./ZIPParser";
import { TARParser } from "./TARParser";
import { FileBufferSummary, Parser } from "./Parser";

export function getParsers(): Parser[] {
    return [
        new CSVParser(),
        new XMLParser(),
        new JSONParser(),
        new AVROParser(),
        new XLSXParser(),
        new GZipParser(),
        new BZip2Parser(),
        new ZIPParser(),
        new TARParser()
    ];
}

export function getParser(streamSummary: FileBufferSummary): Maybe<Parser> {
    const parsers = getParsers();
    return parsers.find((parser) => parser.supportsFileStream(streamSummary)) || null;
}

export function getParserByMimeType(mimeType: string): Maybe<Parser> {
    const parsers = getParsers();
    return parsers.find((parser) => parser.getMimeType() === mimeType) || null;
}
