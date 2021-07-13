import { DPMConfiguration } from "datapm-lib";
import { Readable, Transform } from "stream";
import { Maybe } from "../generated/graphql";
import { StreamState } from "../sink/SinkUtil";
import { SourceInspectionContext, UpdateMethod } from "../source/SourceUtil";

import { BZip2Parser } from "./BZip2Parser";
import { CSVParser } from "./CSVParser";
import { GZipParser } from "./GZipParser";
import { JSONParser } from "./JSONParser";
import { XMLParser } from "./XMLParser";
import { AVROParser } from "./AVROParser";
import { XLSXParser } from "./XLSXParser";
import { ZIPParser } from "./ZIPParser";
import { TARParser } from "./TARParser";

/** A stream as returned by a file parser before being opened */
export interface ParserStreamContext {
	fileName?: string;

	fileSize?: number;

	openStream(sinkState: Maybe<StreamState>): Promise<FileOpenStreamContext>;
}

export interface ParserInspectionResults {
	schemaPrefix?: string;
	updateMethods: UpdateMethod[];
	stream?: Readable;
	moveToNextStream?(): Promise<FileStreamContext | null>;
}

export interface Parser {
	/** The user friendly name shown during selection */
	getDisplayName(): string;

	/** The unique identifier for the parser implementation */
	getMimeType(): string;

	/** The file extensions supported by this parser */
	getFileExtensions(configuration: DPMConfiguration): string[];

	/** Should return true if the parser implementation will support parsing the given FileStreamSummary */
	supportsFileStream(streamSummary: FileBufferSummary): boolean;

	/** Returns a set of parameters based on the provided uri and configuration */
	inspectFile(
		fileStreamSummary: FileBufferSummary,
		configuration: DPMConfiguration,
		context: SourceInspectionContext
	): Promise<ParserInspectionResults>;

	/** Returns the transforms necessary parse based on the configuration */
	getTransforms(schemaPrefix: string, configuration: DPMConfiguration, sinkState: Maybe<StreamState>): Transform[];
}

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

export interface FileSetContext {
	fileStreamIterator: Iterator<FileStreamContext>;
}
export interface FileStreamContext {
	uri: string;

	fileName: string;

	fileSize?: number;
	/** The mimetype as reported by the source. For example, the HTTP "Content-Type" header. */
	reportedMimeType?: string;

	/** The mime type as discovered through inspection of the stream. This is supplied by 'magic mime type' database */
	detectedMimeType?: string | null;

	/** Returns a value that represents the state of the file as compared to
	 * prior or future states. For example, the last updated date, or the etag
	 * of an HTTP response.
	 *
	 * This value is used by the system to determine if it is reasonable to start reading
	 * records that have previously been read
	 */
	lastUpdatedHash?: string;

	/** The file contents and associated meta data that is discovered when opening the file */
	openStream(sinkState: Maybe<StreamState>): Promise<FileOpenStreamContext>;
}

/** Information available after opening the stream */
export interface FileOpenStreamContext {
	fileName?: string;

	fileSize?: number;

	/** The mimetype as reported by the source. For example, the HTTP "Content-Type" header. */
	reportedMimeType?: string;

	/** The mime type as discovered through inspection of the stream. This is supplied by 'magic mime type' database */
	detectedMimeType?: string | null;

	/** Returns a value that represents the state of the file as compared to
	 * prior or future states. For example, the last updated date, or the etag
	 * of an HTTP response.
	 *
	 * This value is used by the system to determine if it is reasonable to start reading
	 * records that have previously been read
	 */
	lastUpdatedHash?: string;

	/** The file contents */
	stream: Readable;
}

/** Like the FileStreamContext, except with just a buffer of the header data */
export interface FileBufferSummary {
	uri: string;

	/** Name of the file */
	fileName: string;

	/** Discovered file size if possible */
	fileSize?: number;

	/** The mimetype as reported by the source. For example, the HTTP "Content-Type" header. */
	reportedMimeType?: string;

	/** The mime type as discovered through inspection of the stream. This is supplied by 'magic mime type' database */
	detectedMimeType?: string | null;

	/** Returns a value that represents the state of the file as compared to
	 * prior or future states. For example, the last updated date, or the etag
	 * of an HTTP response.
	 *
	 * This value is used by the system to determine if it is reasonable to start reading
	 * records that have previously been read
	 */
	lastUpdatedHash?: string;

	/** A peek buffer for investgating the header contents of the file */
	buffer: Buffer;

	/** The raw stream to the file */
	stream: Readable;
}
