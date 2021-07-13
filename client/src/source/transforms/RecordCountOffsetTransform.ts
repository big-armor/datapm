import { Transform, TransformCallback } from "stream";

export class RecordCountOffsetTransform extends Transform {
	startOffset = 0;
	currentOffset = 0;

	constructor(startOffset: number) {
		super({ objectMode: true });
		this.startOffset = startOffset;
	}

	_transform(chunk: unknown[], encoding: BufferEncoding, callback: TransformCallback): void {
		if (this.startOffset <= this.currentOffset) {
			callback(null, chunk);
		} else if (this.startOffset <= this.currentOffset + chunk.length) {
			chunk.splice(0, this.startOffset - this.currentOffset + 1);
			callback(null, chunk);
		}

		this.currentOffset += chunk.length;
	}
}
