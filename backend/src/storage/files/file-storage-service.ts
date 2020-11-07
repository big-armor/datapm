import { DPMStorage } from "../dpm-storage";
import { StorageProvider } from "../storage-provider";
import { Stream } from "stream";

export enum FileStorageNameSpace {
    IMAGES = "images",
    FILES = "files",
    DATA = "data"
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
