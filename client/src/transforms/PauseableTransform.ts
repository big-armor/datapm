import { Transform, TransformCallback, TransformOptions } from "stream";

/** The native Transform implementation goes into "flowing" mode automatically when .pipe() is called.
 * For sources/sinks that require time to get ready at the start or during flowing, this is required
 * to stop the flow of chunks until the source/sink is ready.
 */
export class PausingTransform extends Transform {
    pausedData: unknown[] = [];
    actuallyPaused: boolean;
    lastCallBack: TransformCallback | null = null;

    constructor(paused: boolean, opts?: TransformOptions) {
        super(opts);
        this.actuallyPaused = paused;
    }

    _transform(chunk: unknown, encoding: string, callback: TransformCallback): void {
        if (this.actuallyPaused) {
            this.pausedData.push(chunk);
            this.lastCallBack = callback;
        } else {
            callback(null, chunk);
        }
    }

    async internalFlush(): Promise<void> {
        for (const data of this.pausedData) {
            const ok = this.push(data);

            if (!ok) {
                this.actuallyPaused = true;
                await new Promise((resolve) => this.once("drain", resolve));
            }
        }
        this.pausedData = [];
    }

    _flush(callback: TransformCallback): void {
        this.internalFlush().then(() => callback(null));
    }

    actuallyPause(): this {
        this.actuallyPaused = true;
        return this;
    }

    async actuallyResume(): Promise<this> {
        this.actuallyPaused = false;

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        await this.internalFlush();

        if (this.lastCallBack) {
            this.lastCallBack();
            this.lastCallBack = null;
        }
        return this;
    }
}
