import { Readable, Stream } from "stream";
import { AvroService } from "../../avro/avro-service";
import { FileStorageService } from "../files/file-storage-service";
import avro, { streams } from "avsc";
import Blob from "fetch-blob";
import * as fs from "fs";

export class DataStorageService {
    public static readonly INSTANCE = new DataStorageService();

    private readonly NAMESPACE = "data";
    private readonly AVRO_FILE_EXTENSION = ".avro";
    private readonly TMP_DECODER_PATH = "tmp-registry-server-storage";
    private readonly MAXIMUM_LENGTH_FOR_AVRO_HEADER_IN_BYTES = 1024;

    private readonly fileStorageService = FileStorageService.INSTANCE;

    public async writePackageDataFromStream(
        packageVersionId: number,
        dataStream: Readable,
        transformer?: any
    ): Promise<void> {
        // if (!this.avroService.isValidAvroSchema(schema)) {
        //     throw new Error("INVALID_AVRO_SCHEMA");
        // }

        await FileStorageService.INSTANCE.writeFileFromStream(
            this.NAMESPACE,
            packageVersionId + this.AVRO_FILE_EXTENSION,
            dataStream
        );

        console.log("before header");
        console.log(this.TMP_DECODER_PATH + "/" + this.NAMESPACE + "/" + packageVersionId + this.AVRO_FILE_EXTENSION);
        const decoder = avro.createFileDecoder(
            this.TMP_DECODER_PATH + "/" + this.NAMESPACE + "/" + packageVersionId + this.AVRO_FILE_EXTENSION
        );
        decoder.on("metadata", (d) => {
            console.log("decoder metadata", d);
            decoder.end();
        });

        // const decoder = await this.buildAvroDecoder(packageVersionId, dataStream);
        // decoder.on("data", (d) => console.log("decoder data", d));

        // Validate schema is valid and peek into the first 100 rows
        // AvroService.INSTANCE.validateRows(schema, dataStream);

        // return this.fileStorageService.writeFileFromStream(path, sourceSlug, stream, transformer);
    }

    // public async readPackageDataFromStream(packageId: number, sourceSlug: string): Promise<Readable> {
    //     const path = this.PREFIX + packageId + "/" + sourceSlug;
    //     return this.fileStorageService.readFile(path, sourceSlug);
    // }

    // private async buildAvroDecoder(packageVersionId: number, dataStream: Readable): Promise<streams.BlockDecoder> {
    //     const finalStream = dataStream.pipe(take)
    //     await FileStorageService.INSTANCE.writeFileFromStream(this.NAMESPACE, packageVersionId + this.AVRO_FILE_EXTENSION, dataStream);

    //     const filePath = this.TMP_DECODER_PATH + packageVersionId;
    //     const file = fs.readFileSync(filePath);
    //     const decoder = avro.extractFileHeader(filePath);
    //     fs.readFileSync(filePath);
    //     return decoder;
    // }

    // private trimStream(stream: Readable): Readable {
    //     const trimmedStream = new Readable();

    //     let bytesReadSoFar = 0;
    //     stream.pipe((a) => {
    //         return a;
    //     })
    //     stream.on("data", (data: Buffer) => {
    //         trimmedStream.push(data);
    //         if (bytesReadSoFar >= this.MAXIMUM_LENGTH_FOR_AVRO_HEADER_IN_BYTES) {

    //         }
    //     });
    //     return trimmedStream;
    // }
}
