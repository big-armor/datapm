import { AbstractPassThroughParser } from "./AbstractPassthroughParser";
import unbzip2 from "unbzip2-stream";
import { Transform } from "stream";

export class BZip2Parser extends AbstractPassThroughParser {
    getDisplayName(): string {
        return "BZip2";
    }

    getMimeType(): string {
        return "application/bzip2";
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
