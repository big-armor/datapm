import { Readable, Stream, Writable } from "stream";

export class DpmStorageStreamHolder {
    private readonly OPEN_READ_STREAMS: Readable[] = [];
    private readonly OPEN_WRITE_STREAMS: Writable[] = [];

    public copyToStream(dataStream: Stream, targetStream: Writable, transformer?: any): Promise<void> {
        this.registerWriteStream(targetStream);
        this.addPipesToDataStream(dataStream, targetStream, transformer);

        return new Promise<void>((resolve, reject) => {
            dataStream.on("end", () => resolve());
            dataStream.on("error", (error) => {
                targetStream.destroy();
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

    private addPipesToDataStream(dataStream: Stream, targetStream: Writable, transformer: any): void {
        if (transformer) {
            dataStream.pipe(transformer).pipe(targetStream);
        } else {
            dataStream.pipe(targetStream);
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
