import { Transform, TransformCallback } from "stream";

export class LineCountOffsetTransform extends Transform {
	startOffset: number;
	currentOffset: number;

	buffer: Buffer;

	chunkType: string;

	constructor(startLine: number) {
		super({ objectMode: false });
		this.startOffset = 0;

		this.startOffset = startLine;

		this.currentOffset = 0;
	}

	_transform(chunk: string | Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
		if (this.chunkType == null) {
			this.chunkType = typeof chunk;
		}

		const buffer = this.chunkType === "string" ? Buffer.from(chunk) : (chunk as Buffer);

		if (this.buffer == null) this.buffer = buffer;
		else this.buffer = Buffer.concat([this.buffer, buffer]);

		do {
			const newLineIndex = this.buffer.indexOf("\n");

			if (newLineIndex === -1) break;

			const line = this.buffer.slice(0, newLineIndex + 1);
			this.buffer = this.buffer.slice(newLineIndex + 1);

			if (this.startOffset <= this.currentOffset) {
				this.push(line, encoding);
			}
			this.currentOffset++;
		} while (true);

		callback(null);
	}

	_flush(callback: TransformCallback): void {
		callback(null, this.buffer);
	}
}
