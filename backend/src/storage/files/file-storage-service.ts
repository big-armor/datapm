import { DPMStorage } from "../dpm-storage";
import { StorageProvider } from "../storage-provider";
import { Readable, Stream } from "stream";
import fs from "fs";

export enum FileStorageNameSpace {
    README_FILE = "README_FILE",
    LICENSE_FILE = "LICENSE_FILE",
    PACKAGE_FILE = "PACKAGE_FILE",
    USER_COVER_IMAGE = "USER_COVER_IMAGE",
    USER_AVATAR_IMAGE = "USER_AVATAR_IMAGE",
    CATALOG_COVER_IMAGE = "CATALOG_COVER_IMAGE",
    PACKAGE_COVER_IMAGE = "PACKAGE_COVER_IMAGE",
    COLLECTION_COVER_IMAGE = "COLLECTION_COVER_IMAGE"
}

export class FileStorageService {
    public static readonly INSTANCE = new FileStorageService();

    private readonly storageService: DPMStorage = StorageProvider.getStorage();

    public async writeFileFromBuffer(
        namespace: FileStorageNameSpace,
        itemId: string,
        contents: Buffer,
        transformer?: any
    ): Promise<void> {
        const stream = this.convertBufferToStream(contents);
        return this.storageService.writeItem(namespace, itemId, stream, transformer);
    }

    public async writeFileFromString(
        namespace: FileStorageNameSpace,
        itemId: string,
        contents: string,
        transformer?: any
    ): Promise<void> {
        const stream = this.convertStringToStream(contents);
        return this.storageService.writeItem(namespace, itemId, stream, transformer);
    }

    public async writeFile(
        namespace: FileStorageNameSpace,
        itemId: string,
        stream: Stream,
        transformer?: any
    ): Promise<void> {
        return this.storageService.writeItem(namespace, itemId, stream, transformer);
    }

    public async deleteFile(namespace: FileStorageNameSpace, itemId: string): Promise<void> {
        return this.storageService.deleteItem(namespace, itemId);
    }

    public async readFile(namespace: FileStorageNameSpace, itemId: string): Promise<Stream> {
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
