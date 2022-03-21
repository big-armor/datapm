import ON_DEATH from "death";
import { Transform, TransformCallback } from "stream";

/** A passthrough transform that ends the stream on time or death (ctl-c) */
export class TimeOrDeathTransform extends Transform {
    maxTimeMs: number;
    timeout: NodeJS.Timeout | undefined;
    cancelDeath: (() => void) | undefined;

    constructor(maxTimeMs: number) {
        super({ objectMode: true });
        this.maxTimeMs = maxTimeMs;

        this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this.end();
        }, this.maxTimeMs);

        this.cancelDeath = ON_DEATH((signal) => {
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = undefined;
            }
            if (this.cancelDeath) {
                this.cancelDeath();
                this.cancelDeath = undefined;
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
        if (this.cancelDeath) {
            this.cancelDeath();
            this.cancelDeath = undefined;
        }
        callback(null);
    }

    _destroy(_error: Error | null, callback: (error: Error | null) => void): void {
        if (this.cancelDeath) {
            this.cancelDeath();
            this.cancelDeath = undefined;
        }
        callback(null);
    }
}
