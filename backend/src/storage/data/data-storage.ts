import { FileStorageService } from "../files/file-storage-service";
import { BatchRepositoryIdentifier } from "datapm-lib";
import { Readable } from "stream";
import zlib from "zlib";
import { PackrStream, UnpackrStream } from "msgpackr";

enum Prefixes {
    DATA = "data",
    UPLOAD_FILE = "upload"
}

export interface DataFile {
    readable: Readable;
    startOffset: number;
    nextStartOffset: number | null;
}
export interface IterableDataFiles {
    getNext: () => Promise<DataFile | null>;
}

export class DataStorageService {
    public static readonly INSTANCE = new DataStorageService();
    private fileStorageService = FileStorageService.INSTANCE;

    /** Read the records from a batch for a given package.
     *
     * @param batchId The package id
     * @param offsetStart The offset to start reading from (this should be one more than the last end offset)
     */
    public async readDataBatch(batchId: number, startOffset?: number): Promise<IterableDataFiles> {
        const namespace = this.getBatchNamespace(batchId);

        const files = await this.getBatchFiles(batchId);

        let index = 0;

        if (startOffset) {
            index = files.filter((file) => this.fileNameToStartOffset(file) >= startOffset).length;
        }

        return {
            getNext: async (): Promise<DataFile | null> => {
                if (index > files.length - 1) {
                    return null;
                }

                const currentStartOffSet = this.fileNameToStartOffset(files[index]);

                let nextStartOffset = null;

                if (index < files.length - 1) {
                    nextStartOffset = this.fileNameToStartOffset(files[index + 1]);
                }

                const fileStream = await this.fileStorageService.readFile(namespace, files[index]);

                const dataFormatter = new UnpackrStream();
                const decompressor = zlib.createGunzip();

                fileStream.pipe(decompressor);
                decompressor.pipe(dataFormatter);

                index++;

                return {
                    readable: dataFormatter,
                    startOffset: currentStartOffSet,
                    nextStartOffset
                };
            }
        };
    }

    /** Stream should be a stream of RecordContext */
    public async writeBatch(batchId: number, offsetStart: number, stream: Readable): Promise<void> {
        const namespace = this.getBatchNamespace(batchId);

        // TODO Validate that the offsets being written arn't smaller than the offsets already written
        // do this in the database? or in the file system? (database seems stronger, but will causes consistency issues)

        // TODO customize PackrStream??
        const dataFormatter = new PackrStream();
        const compressor = zlib.createGzip();

        dataFormatter.pipe(compressor);
        stream.pipe(dataFormatter);

        return this.fileStorageService.writeFileFromStream(namespace, offsetStart + ".msgpack.gz", compressor);
    }

    deleteBatch(batchId: number): Promise<void> {
        const namespace = this.getBatchNamespace(batchId);

        return this.fileStorageService.deleteFiles(namespace);
    }

    private getBatchNamespace(batchId: number): string[] {
        return [Prefixes.DATA, batchId.toString()];
    }

    private async getBatchFiles(batchId: number): Promise<string[]> {
        const namespace = this.getBatchNamespace(batchId);
        const files = await this.fileStorageService.listFiles(namespace);

        const filteredFiles = files.filter((file) => !file.startsWith(Prefixes.UPLOAD_FILE));

        const sortedFiles = filteredFiles.sort((a, b) => {
            const aInt = this.fileNameToStartOffset(a);
            const bInt = this.fileNameToStartOffset(b);

            if (aInt < bInt) {
                return -1;
            }
            if (aInt > bInt) {
                return 1;
            }
            return 0;
        });

        return sortedFiles;
    }

    private fileNameToStartOffset(fileName: string): number {
        const numberOnly = fileName.replace(".msgpack.gz", "");
        return Number.parseInt(numberOnly);
    }
}
