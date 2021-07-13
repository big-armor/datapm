import { Transform, TransformCallback } from "stream";

/** Buffers chunks of bytes recieved, and emits a single large buffer at a separator.
 */
export class ByteBatchingTransform extends Transform {
    buffers: Buffer[] = [];
    maxSize: number;
    bufferSize = 0;
    separator: string;

    constructor(maxSize: number, separator = "\n") {
        super({ objectMode: false });
        this.maxSize = maxSize;
        this.separator = separator;
    }

    _transform(chunk: Buffer | string, encoding: BufferEncoding, callback: TransformCallback): void {
        this.buffers.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        this.bufferSize += chunk.length;

        if (this.bufferSize >= this.maxSize) {
            const bufferedBytes = Buffer.concat(this.buffers);

            const lastIndex = bufferedBytes.lastIndexOf(this.separator);

            if (lastIndex === -1) {
                callback(null);
                return;
            }

            if (lastIndex === bufferedBytes.length - 1) {
                this.push(bufferedBytes);
                this.buffers = [];
            } else {
                this.buffers = [bufferedBytes.subarray(lastIndex + 1)];
                this.push(bufferedBytes.subarray(0, lastIndex));
            }
        }

        callback(null);
    }

    _final(callback: (error?: Error | null) => void): void {
        this.push(Buffer.concat(this.buffers));
        this.buffers = [];
        callback(null);
    }
}
