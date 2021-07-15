import { Transform, TransformCallback } from "stream";

export class LineCountOffsetTransform extends Transform {
    startOffset: number;
    currentOffset: number;

    buffer: Buffer;

    constructor(startByte: number) {
        super({ objectMode: false });
        this.startOffset = 0;

        this.startOffset = startByte;

        this.currentOffset = 0;
    }

    _transform(chunk: string | Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
        if (chunk.length + this.currentOffset < this.startOffset) {
            this.currentOffset += chunk.length;
            process.nextTick(callback);
            return;
        }

        if (this.currentOffset <= this.startOffset) {
            if (typeof chunk === "string") this.push(chunk.substr(this.startOffset - this.currentOffset));
            else this.push((chunk as Buffer).subarray(this.startOffset - this.currentOffset));
        } else {
            this.push(chunk);
        }

        this.currentOffset += chunk.length;

        process.nextTick(callback);
    }

    _flush(callback: TransformCallback): void {
        callback(null, this.buffer);
    }
}
