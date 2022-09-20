import { DPMStorage } from "../dpm-storage";
import { StorageProvider } from "../storage-provider";
import { Duplex, Readable, Transform } from "stream";
import { off } from "process";

export enum StorageErrors {
    FILE_DOES_NOT_EXIST = "FILE_DOES_NOT_EXIST"
}

export class FileStorageService {
    public static readonly INSTANCE = new FileStorageService();

    private readonly storageService: DPMStorage = StorageProvider.getStorage();

    public async writeFileFromBuffer(
        namespace: string[],
        itemId: string,
        contents: Buffer,
        transformer?: Duplex
    ): Promise<void> {
        const stream = this.convertBufferToStream(contents);
        return this.storageService.writeStream(namespace, itemId, stream, transformer);
    }

    public async writeFileFromStream(
        namespace: string[],
        itemId: string,
        stream: Readable,
        transformer?: Duplex
    ): Promise<void> {
        return this.storageService.writeStream(namespace, itemId, stream, transformer);
    }

    public async writeFileFromString(
        namespace: string[],
        itemId: string,
        contents: string,
        transformer?: Duplex
    ): Promise<void> {
        const stream = this.convertStringToStream(contents);
        return this.storageService.writeStream(namespace, itemId, stream, transformer);
    }

    public async writeFile(
        namespace: string[],
        itemId: string,
        stream: Readable,
        transformer?: Transform
    ): Promise<void> {
        return this.storageService.writeStream(namespace, itemId, stream, transformer);
    }

    public async fileExists(namespace: string[], itemId: string): Promise<boolean> {
        return this.storageService.itemExists(namespace, itemId);
    }

    public async moveFile(
        oldNamespace: string[],
        oldItemId: string,
        newNamespace: string[],
        newItemId: string
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            return this.storageService.moveFile(oldNamespace, oldItemId, newNamespace, newItemId, (error) => {
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }

    public async deleteFiles(namespace: string[], fileNames: string[] = []): Promise<void> {
        if (fileNames.length === 0) return this.storageService.deleteAllItems(namespace);
        else {
            for (let i = 0; i < fileNames.length; i++) {
                await this.deleteFile(namespace, fileNames[i]);
            }
        }
    }

    public async deleteFile(namespace: string[], itemId: string): Promise<void> {
        try {
            return this.storageService.deleteItem(namespace, itemId);
        } catch (error) {
            if (error.message.includes("FILE_DOES_NOT_EXIST")) {
                console.warn("Tried deleting a file that does not exist" + namespace + "/" + itemId);
                return;
            }

            throw error;
        }
    }

    public async listFiles(namespace: string[]): Promise<string[]> {
        return this.storageService.listItems(namespace);
    }

    public async readFile(namespace: string[], itemId: string): Promise<Readable> {
        return this.storageService.getItem(namespace, itemId);
    }

    private convertStringToStream(value: string): Readable {
        const bufferStream = new Readable();
        bufferStream.push(value);
        bufferStream.push(null);
        return bufferStream;
    }

    private convertBufferToStream(value: Buffer): Readable {
        const bufferStream = new Readable();
        bufferStream.push(value);
        bufferStream.push(null);
        return bufferStream;
    }
}
