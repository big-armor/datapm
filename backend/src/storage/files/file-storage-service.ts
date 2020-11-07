import { DPMStorage } from "../dpm-storage";
import { StorageProvider } from "../storage-provider";
import { Stream } from "stream";
import fs from "fs";

export enum FileStorageNameSpace {
    FILES = "FILES",
    DATA = "DATA",
    USER_COVER_IMAGE = "USER_COVER_IMAGE",
    USER_AVATAR_IMAGE = "USER_AVATAR_IMAGE",
    CATALOG_COVER_IMAGE = "CATALOG_COVER_IMAGE",
    PACKAGE_COVER_IMAGE = "PACKAGE_COVER_IMAGE",
    COLLECTION_COVER_IMAGE = "COLLECTION_COVER_IMAGE"
}

export class FileStorageService {
    public static readonly INSTANCE = new FileStorageService();

    private readonly storageService: DPMStorage = StorageProvider.getStorage();

    public writeFile(namespace: string, itemId: string, stream: Stream, transformer?: any): Promise<void> {
        return this.storageService.writeItem(namespace, itemId, stream, transformer);
    }

    public readFile(namespace: string, itemId: string): Promise<Stream> {
        return this.storageService.getItem(namespace, itemId);
    }
}
