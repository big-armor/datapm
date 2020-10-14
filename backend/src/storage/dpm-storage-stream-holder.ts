import { Readable, Stream, Writable } from "stream";

export class DpmStorageStreamHolder {
    private readonly OPEN_READ_STREAMS: Readable[] = [];
    private readonly OPEN_WRITE_STREAMS: Writable[] = [];

    public resolveReadStream(stream: Readable): Promise<Stream> {
        this.registerReadStream(stream);
        return Promise.resolve(stream);
    }

    public copyToStream(dataStream: Stream, targetStream: Writable): Promise<void> {
        this.registerWriteStream(targetStream);
        return new Promise<void>((resolve, reject) => {
            dataStream.on("data", (data) => targetStream.write(data));
            dataStream.on("end", () => {
                targetStream.end();
                resolve();
            });
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

    private registerReadStream(stream: Readable): void {
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
