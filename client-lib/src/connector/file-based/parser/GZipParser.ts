import { Transform } from "stream";
import { AbstractPassThroughParser } from "./AbstractPassthroughParser";
import zlib from "zlib";
import { DPMConfiguration } from "datapm-lib";
import { DISPLAY_NAME, FILE_EXTENSIONS, MIME_TYPE, MIME_TYPES } from "./GZipParserDescription";

export class GZipParser extends AbstractPassThroughParser {
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

    getPassThroughTransforms(_configuration: DPMConfiguration): Transform[] {
        return [zlib.createGunzip()];
    }
}
