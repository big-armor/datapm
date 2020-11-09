import { DPMStorage } from "../dpm-storage";
import { StorageProvider } from "../storage-provider";
import { Readable, Stream } from "stream";
import fs from "fs";

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

    public async writeFile(namespace: string, itemId: string, stream: Stream, transformer?: any): Promise<void> {
        return this.storageService.writeItem(namespace, itemId, stream, transformer);
    }

    public async deleteFile(namespace: string, itemId: string): Promise<void> {
        return this.storageService.deleteItem(namespace, itemId);
    }

    public async readFile(namespace: string, itemId: string): Promise<Stream> {
        return this.storageService.getItem(namespace, itemId);
    }

    private convertStringToStream(value: string): Stream {
        const bufferStream = new Readable();
        bufferStream.push(value);
        bufferStream.push(null);
        return bufferStream;
    }

    private convertBufferToStream(value: Buffer): Stream {
        const bufferStream = new Readable();
        bufferStream.push(value);
        bufferStream.push(null);
        return bufferStream;
    }
}
