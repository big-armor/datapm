import ON_DEATH from "death";
import { Transform, TransformCallback } from "stream";

export class TimeOrDeathTransform extends Transform {
    maxTimeMs: number;
    timeout: NodeJS.Timeout | undefined;

    constructor(maxTimeMs: number) {
        super({ objectMode: true });
        this.maxTimeMs = maxTimeMs;

        this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this.end();
        }, this.maxTimeMs);

        ON_DEATH((signal) => {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = undefined;
            }
            this.end();
        });
    }

    _transform(chunk: never, encoding: BufferEncoding, callback: TransformCallback): void {
        this.push(chunk);
        callback(null);
    }

    _flush(callback: TransformCallback): void {
        callback(null);
    }

    _final(callback: (error?: Error | null) => void): void {
        callback(null);
    }
}
