import { FileStorageService } from "../files/file-storage-service";
import { BatchIdentifier } from "datapm-lib";
import { Readable } from "stream";
import { queue } from "sharp";
import { Gzip } from "minizlib";
import { PackrStream } from "msgpackr";

enum Prefixes {
    DATA = "data",
    UPLOAD_FILE = "upload"
}
export class LocalDataStorageService {
    public static readonly INSTANCE = new LocalDataStorageService();
    private fileStorageService = FileStorageService.INSTANCE;

    public async readDataBatch(packageId: number, identifier: BatchIdentifier): Promise<{
        getNext: () => Promise<{readable:Readable,startOffset:number, endOffset:number, nextStartOffset:number | null } | null>
    }> {

        const namespace = this.getBatchNamespace(packageId, identifier);

        const files = await this.getBatchFiles(packageId, identifier);

        let index = 0;

        return {
            getNext: async ():Promise<{readable:Readable,startOffset:number,endOffset:number,nextStartOffset:number | null } | null> => {
                if(index > files.length - 1) {
                    return null;
                }

                const currentRange = this.fileNameToRange(files[index]);

                let nextRange = null;

                if(index < files.length - 1) {
                    nextRange = this.fileNameToRange(files[index + 1]);
                }

                index++;

                return {
                    readable: await this.fileStorageService.readFile(namespace,files[index++]),
                    startOffset: currentRange.start,
                    endOffset: currentRange.end,
                    nextStartOffset: nextRange ? nextRange.start : null
                };
            }
        };
    }

    /** Stream should be a stream of RecordContext */
    public async writeBatch(
        packageId: number,
        identifier: BatchIdentifier,
        stream: Readable
    ): Promise<void> {
        const namespace = this.getBatchNamespace(packageId, identifier);

        // TODO Validate that the offsets being written arn't smaller than the offsets already written
        // do this in the database? or in the file system? (database seems stronger, but will causes consistency issues)

        // TODO customize PackrStream??
        const dataFormatter = new PackrStream();
        const compressor = new Gzip();

        dataFormatter.pipe(compressor);
        stream.pipe(dataFormatter);

        return this.fileStorageService.writeFileFromStream(
            namespace,
            Prefixes.UPLOAD_FILE + ".msgpack.gz",
            compressor
        );
    }

    deleteBatch(packageId: number, identifier: BatchIdentifier) {

        const namespace = this.getBatchNamespace(packageId, identifier);

        return this.fileStorageService.deleteFiles(
            namespace
        );
    }

    private getBatchNamespace(packageId: number, identifier: BatchIdentifier): string[] {
        return [
            Prefixes.DATA ,
            packageId.toString() ,
            identifier.majorVersion.toString() ,
            identifier.streamSetSlug,
            identifier.streamSlug,
            identifier.batch.toString()
        ];
    }

    private async getBatchFiles(packageId: number, identifier: BatchIdentifier): Promise<string[]> {
        const namespace = this.getBatchNamespace(packageId, identifier);
        const files = await this.fileStorageService.listFiles(
            namespace
        );

        const filteredFiles = files.filter(file => !file.startsWith(Prefixes.UPLOAD_FILE));

        const sortedFiles = filteredFiles.sort((a, b) => {

            const aInt = this.fileNameToRange(a);
            const bInt = this.fileNameToRange(b);

            if (aInt.start < bInt.start) {
                return -1;
            }
            if (aInt.start > bInt.start) {
                return 1;
            }
            return 0;
        });

        return sortedFiles;
    }

    private async getBatchRange(packageId: number, identifier: BatchIdentifier): Promise<{start:number, end:number} | null> {
        const files = await this.getBatchFiles(packageId, identifier);

        if(files.length === 0) {
            return null;
        }

        const firstFileRange = this.fileNameToRange(files[0]);
        const lastFileRange = this.fileNameToRange(files[files.length - 1]);

        return {
            start: firstFileRange.start,
            end: lastFileRange.end
        }
    }

    private fileNameToRange(fileName:string):{start:number, end:number} {
        const parts = fileName.split("-");
        return {
            start: Number.parseInt(parts[0]),
            end: Number.parseInt(parts[1])
        }
    }

}
