import { Readable } from "stream";
import { AvroService } from "../../avro/avro-service";
import { FileStorageService } from "../files/file-storage-service";

export class DataStorageService {
    public static readonly INSTANCE = new DataStorageService();

    private readonly PREFIX = "data/";
    private readonly fileStorageService = FileStorageService.INSTANCE;
    private readonly avroService = AvroService.INSTANCE;

    public async writePackageDataFromStream(
        packageId: number,
        sourceSlug: string,
        schema: any,
        dataStream: Readable,
        transformer?: any
    ): Promise<void> {
        if (!this.avroService.isValidAvroSchema(schema)) {
            throw new Error("INVALID_AVRO_SCHEMA");
        }

        const path = this.PREFIX + packageId + "/" + sourceSlug;

        // Validate schema is valid and peek into the first 100 rows
        AvroService.INSTANCE.validateRows(schema, dataStream);

        return this.fileStorageService.writeFileFromStream(path, sourceSlug, stream, transformer);
    }

    public async readPackageDataFromStream(packageId: number, sourceSlug: string): Promise<Readable> {
        const path = this.PREFIX + packageId + "/" + sourceSlug;
        return this.fileStorageService.readFile(path, sourceSlug);
    }
}
