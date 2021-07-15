import { Transform, TransformCallback } from "stream";

export class SpigetTransform extends Transform {
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
    _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        callback(null, chunk);
    }
}
