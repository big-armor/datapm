import { AbstractPassThroughParser } from "./AbstractPassthroughParser";
import unbzip2 from "unbzip2-stream";
import { Transform } from "stream";
import { DISPLAY_NAME, MIME_TYPE } from "./BZip2ParserDescription";

export class BZip2Parser extends AbstractPassThroughParser {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    getSupportedMimeTypes(): string[] {
        return ["application/bzip2", "application/x-bzip2"];
    }

    getSupportedFileExtensions(): string[] {
        return ["bzip2", "bz2"];
    }

    getPassThroughTransforms(): Transform[] {
        const transform = unbzip2();

        return [transform];
    }
}
