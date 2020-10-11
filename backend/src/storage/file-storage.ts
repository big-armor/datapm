import { Storage } from "./storage";
import * as Stream from "stream";
import * as fs from "fs";
import { ReadStream, WriteStream } from "fs";

export class FileStorage implements Storage {
	private readonly SCHEMA_URL: string;

	private readonly OPEN_READ_STREAMS: ReadStream[] = [];
	private readonly OPEN_WRITE_STREAMS: WriteStream[] = [];

	public constructor(url: string) {
		this.ensureAccessToUrl(url);
		this.SCHEMA_URL = url;
	}

	public claimSchema(url: string): boolean {
		return FileStorage.hasReadWriteAccessInDirectory(url);
	}

	public getItem(namespace: string, itemId: string): Promise<Stream> {
		const path = this.buildPath(namespace, itemId);
		const readStream = fs.createReadStream(path);
		this.registerReadStream(readStream);
		return Promise.resolve(readStream);
	}

	public start(url: string): void {
		if (!FileStorage.hasReadWriteAccessInDirectory(url)) {
			throw new Error("Has Read/Write access to the filesystem in directory " + url);
		}
	}

	public stop(): boolean {
		try {
			if (this.OPEN_READ_STREAMS.length) {
				this.OPEN_READ_STREAMS.forEach((stream) => stream.destroy());
			}

			if (this.OPEN_WRITE_STREAMS.length) {
				this.OPEN_WRITE_STREAMS.forEach((stream) => stream.destroy());
			}
			return true;
		} catch (e) {
			console.error("Could not flush read and write streams", e);
			return false;
		}
	}

	public writeItem(namespace: string, itemId: string, byteStream: Stream): Promise<void> {
		const path = this.buildPath(namespace, itemId);
		const writeStream = fs.createWriteStream(path);
		this.registerWriteStream(writeStream);
		return new Promise<void>((resolve, reject) => {
			byteStream.on("data", (data) => writeStream.write(data));
			byteStream.on("end", () => {
				writeStream.end();
				resolve();
			});
			byteStream.on("error", (error) => {
				writeStream.destroy();
				reject(error);
			});
		});
	}

	private ensureAccessToUrl(url: string): void {
		const hasAccessToUrl = this.claimSchema(url);
		if (!hasAccessToUrl) {
			throw new Error("Access denied to url: " + url);
		}
	}

	private static hasReadWriteAccessInDirectory(url: string): boolean {
		try {
			fs.accessSync(url, fs.constants.W_OK);
			fs.accessSync(url, fs.constants.R_OK);
			return true;
		} catch (exception) {
			return false;
		}
	}

	private buildPath(namespace: string, itemId: string): string {
		return `${this.SCHEMA_URL}/${namespace}/${itemId}`; // TODO: Add hashing function
	}

	private registerReadStream(stream: ReadStream): void {
		this.registerStream(stream, this.OPEN_READ_STREAMS);
	}

	private registerWriteStream(stream: WriteStream): void {
		this.registerStream(stream, this.OPEN_WRITE_STREAMS);
	}

	private registerStream(stream: Stream, streamCollection: Stream[]): void {
		const streamIndex = streamCollection.push(stream) - 1;
		stream.on("close", () => streamCollection.splice(streamIndex, 1));
	}
}
