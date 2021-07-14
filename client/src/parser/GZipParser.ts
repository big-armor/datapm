import { Transform } from "stream";
import { AbstractPassThroughParser } from "./AbstractPassthroughParser";
import zlip from "zlib";
import { DPMConfiguration } from "datapm-lib";
import { DISPLAY_NAME, MIME_TYPE } from "./GZipParserDescription";

export class GZipParser extends AbstractPassThroughParser {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getMimeType(): string {
        return MIME_TYPE;
    }

    getSupportedMimeTypes(): string[] {
        return ["application/gzip", "application/x-gzip"];
    }

    getSupportedFileExtensions(_configuration: DPMConfiguration): string[] {
        return ["gzip", "gz"];
    }

    getPassThroughTransforms(_configuration: DPMConfiguration): Transform[] {
        return [zlip.createGunzip()];
    }
}
