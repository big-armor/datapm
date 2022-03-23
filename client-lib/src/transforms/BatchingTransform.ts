import { Transform, TransformCallback } from "stream";

/** Buffers chunks recieved, and emits them in arrays. This is useful for batching chunks for performance
 * writing.
 */
export class BatchingTransform extends Transform {
    buffer: unknown[] = [];
    maxSize: number;
    maxDelayMs: number;
    timeout: NodeJS.Timeout | undefined;

    constructor(maxSize: number, maxTimeDelay: number) {
        super({ objectMode: true });
        this.maxSize = maxSize;
        this.maxDelayMs = maxTimeDelay;
    }

    _transform(chunk: unknown, _encoding: BufferEncoding, callback: TransformCallback): void {
        if (Array.isArray(chunk)) {
            this.buffer = this.buffer.concat(chunk);
        } else this.buffer.push(chunk);

        if (this.buffer.length >= this.maxSize) {
            this._flush(callback);
            return;
        } else if (this.timeout == null) {
            this.timeout = setTimeout(() => {
                this._flush(() => {
                    // do nothing
                });
            }, this.maxDelayMs);
        }
        callback(null);
    }

    _flush(callback: (error?: Error | null) => void): void {
        if (this.buffer.length > 0) {
            try {
                while (this.buffer.length > 0) {
                    this.push(this.buffer.splice(0, this.maxSize));
                }
            } catch (e) {
                // console.log(e)
                callback(e);
                return;
            }
        }
        this.buffer = [];
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        callback(null);
    }

    _final(callback: (error?: Error | null) => void): void {
        this._flush(callback);
    }
}
