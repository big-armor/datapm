import { Readable } from "stream";
import { FileStorageService } from "../files/file-storage-service";

export class DataStorageService {
    public static readonly INSTANCE = new DataStorageService();

    private readonly PREFIX = "data/";
    private readonly fileStorageService = FileStorageService.INSTANCE;

    public async writeFileFromStream(
        packageId: number,
        sourceSlug: string,
        stream: Readable,
        transformer?: any
    ): Promise<void> {
        const path = this.PREFIX + packageId + "/" + sourceSlug;
        return this.fileStorageService.writeFileFromStream(path, sourceSlug, stream, transformer);
    }
}
