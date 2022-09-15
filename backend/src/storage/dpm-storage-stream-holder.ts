import { Readable, Stream, Transform, Writable } from "stream";

export class DpmStorageStreamHolder {
    private readonly OPEN_READ_STREAMS: Readable[] = [];
    private readonly OPEN_WRITE_STREAMS: Writable[] = [];

    public copyToStream(readable: Readable, writable: Writable, transformer?: Transform): Promise<void> {
        this.registerWriteStream(writable);
        this.addPipesToDataStream(readable, writable, transformer);

        return new Promise<void>((resolve, reject) => {
            writable.on("finish", async () => {
                resolve();
            });
            readable.on("error", (error) => {
                writable.destroy();
                reject(error);
            });
            writable.on("error", (error) => {
                readable.destroy();
                reject(error);
            });
        });
    }

    public destroyOpenStreams(): boolean {
        try {
            if (this.OPEN_READ_STREAMS.length) {
                this.OPEN_READ_STREAMS.forEach((stream) => stream.destroy());
            }

            if (this.OPEN_WRITE_STREAMS.length) {
                this.OPEN_WRITE_STREAMS.forEach((stream) => stream.destroy());
            }
            return true;
        } catch (e) {
            console.error("Could not flush read and write streams", e);
            return false;
        }
    }

    private addPipesToDataStream(readable: Stream, writable: Writable, transformer?: Transform): void {
        if (transformer) {
            readable.pipe(transformer).pipe(writable);
        } else {
            readable.pipe(writable);
        }
    }

    public registerReadStream(stream: Readable): void {
        this.registerStream(stream, this.OPEN_READ_STREAMS);
    }

    private registerWriteStream(stream: Writable): void {
        this.registerStream(stream, this.OPEN_WRITE_STREAMS);
    }

    private registerStream(stream: Stream, streamCollection: Stream[]): void {
        const streamIndex = streamCollection.push(stream) - 1;
        stream.on("close", () => streamCollection.splice(streamIndex, 1));
    }
}
