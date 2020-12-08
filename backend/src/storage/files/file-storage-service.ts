import { DPMStorage } from "../dpm-storage";
import { StorageProvider } from "../storage-provider";
import { Readable, Stream } from "stream";
import fs from "fs";

export enum StorageErrors {
    FILE_DOES_NOT_EXIST = "FILE_DOES_NOT_EXIST"
}

export class FileStorageService {
    public static readonly INSTANCE = new FileStorageService();

    private readonly storageService: DPMStorage = StorageProvider.getStorage();

    public async writeFileFromBuffer(
        namespace: string,
        itemId: string,
        contents: Buffer,
        transformer?: any
    ): Promise<void> {
        const stream = this.convertBufferToStream(contents);
        return this.storageService.writeItem(namespace, itemId, stream, transformer);
    }

    public async writeFileFromString(
        namespace: string,
        itemId: string,
        contents: string,
        transformer?: any
    ): Promise<void> {
        const stream = this.convertStringToStream(contents);
        return this.storageService.writeItem(namespace, itemId, stream, transformer);
    }

    public async writeFile(namespace: string, itemId: string, stream: Readable, transformer?: any): Promise<void> {
        return this.storageService.writeItem(namespace, itemId, stream, transformer);
    }

    public async fileExists(namespace: string, itemId: string): Promise<boolean> {
        return this.storageService.itemExists(namespace, itemId);
    }

    public async deleteFile(namespace: string, itemId: string): Promise<void> {
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

    public async readFile(namespace: string, itemId: string): Promise<Readable> {
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
