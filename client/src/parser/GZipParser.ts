import { Transform } from "stream";
import { AbstractPassThroughParser } from "./AbstractPassthroughParser";
import zlip from "zlib";
import { DPMConfiguration } from "datapm-lib";

export class GZipParser extends AbstractPassThroughParser {
	getDisplayName(): string {
		return "GZip";
	}

	getMimeType(): string {
		return "application/gzip";
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
