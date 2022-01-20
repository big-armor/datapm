import { Stream, Readable } from "stream";

export interface DPMStorage {
    start(url: string): void;
    writeStream(namespace: string[], itemId: string, byteStream: Readable, transformer?: any): Promise<void>;
    getItem(namespace: string[], itemId: string): Promise<Readable>;
    deleteItem(namespace: string[], itemId: string): Promise<void>;
    deleteAllItems(namespace: string[]): Promise<void>;
    moveFile(oldNamespace: string[], oldItemId:string, newNamespace:string[], newItemId:string, callback: (error: any | undefined) => void): Promise<void>;
    itemExists(namespace: string[], itemId: string): Promise<boolean>;
    stop(): boolean;
    listItems(namespace: string[]): Promise<string[]>;
}
