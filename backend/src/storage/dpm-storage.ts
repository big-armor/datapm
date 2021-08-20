import { Stream, Readable } from "stream";

export interface DPMStorage {
    start(url: string): void;
    writeItem(namespace: string[], itemId: string, byteStream: Readable, transformer?: any): Promise<void>;
    getItem(namespace: string[], itemId: string): Promise<Readable>;
    deleteItem(namespace: string[], itemId: string): Promise<void>;
    moveFile(oldNamespace: string[], oldItemId:string, newNamespace:string[], newItemId:string, callback: any): Promise<void>;
    itemExists(namespace: string[], itemId: string): Promise<boolean>;
    stop(): boolean;
}
