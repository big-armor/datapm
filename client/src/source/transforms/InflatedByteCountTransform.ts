import { Transform, TransformCallback, TransformOptions } from "stream";

export class InflatedByteCountTransform extends Transform {
    callback: (bytesReceived: number) => void;

    constructor(callback: (bytesReceived: number) => void, opts?: TransformOptions) {
        super(opts);
        this.callback = callback;
    }

    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        this.callback(chunk.length);

        callback(null, chunk);
    }
}
