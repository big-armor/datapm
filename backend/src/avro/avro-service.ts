import avro from "avsc";
import { Readable } from "stream";
const peek = require("buffer-peek-stream").promise;

export class AvroService {
    public static readonly INSTANCE = new AvroService();

    public isValidAvroSchema(schema: string): boolean {
        return avro.Type.isType(schema);
    }

    public async validateRows(schema: string, dataStream: Readable): void {
        const avroType = avro.Type.forSchema(schema);
        const buffer = await this.convertStreamToBuffer(dataStream);
    }

    private convertBufferToStream(value: Buffer): Readable {
        const bufferStream = new Readable();
        bufferStream.push(value);
        bufferStream.push(null);
        return bufferStream;
    }

    private convertStreamToBuffer(stream: Readable): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const bufferParts: any = [];
            stream.on("data", (d) => bufferParts.push(d));
            stream.on("end", () => {
                const buffer = Buffer.concat(bufferParts);
                resolve(buffer);
            });
            stream.on("error", (e) => reject(e));
        });
    }
}
