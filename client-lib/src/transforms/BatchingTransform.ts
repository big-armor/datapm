import { Transform, TransformCallback } from "stream";

/** Buffers chunks recieved, and emits them in arrays. This is useful for batching chunks for performance
 * writing.
 */
export class BatchingTransform extends Transform {
    buffer: unknown[] = [];
    maxSize: number;

    constructor(maxSize: number) {
        super({ objectMode: true });
        this.maxSize = maxSize;
    }

    _transform(chunk: unknown, _encoding: BufferEncoding, callback: TransformCallback): void {
        if (Array.isArray(chunk)) {
            this.buffer = this.buffer.concat(chunk);
        } else this.buffer.push(chunk);

        if (this.buffer.length >= this.maxSize) {
            while (this.buffer.length >= this.maxSize) {
                this.push(this.buffer.splice(0, this.maxSize));
            }
        }

        callback(null);
    }

    _flush(callback: (error?: Error | null) => void): void {
        if (this.buffer.length > 0) {
            try {
                this.push(this.buffer);
            } catch (e) {
                // console.log(e)
                callback(e);
                return;
            }
        }
        this.buffer = [];
        callback(null);
    }

    _final(callback: (error?: Error | null) => void): void {
        this._flush(callback);
    }
}
