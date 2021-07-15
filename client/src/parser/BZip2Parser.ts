import { AbstractPassThroughParser } from "./AbstractPassthroughParser";
import unbzip2 from "unbzip2-stream";
import { Transform } from "stream";
import { DISPLAY_NAME, MIME_TYPE, MIME_TYPES, FILE_EXTENSIONS } from "./BZip2ParserDescription";

export class BZip2Parser extends AbstractPassThroughParser {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    getSupportedMimeTypes(): string[] {
        return MIME_TYPES;
    }

    getFileExtensions(): string[] {
        return FILE_EXTENSIONS;
    }

    getPassThroughTransforms(): Transform[] {
        const transform = unbzip2();

        return [transform];
    }
}
