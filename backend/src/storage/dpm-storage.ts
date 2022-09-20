import { Stream, Readable, Transform, Duplex } from "stream";

export interface DPMStorage {
    start(url: string): void;
    writeStream(namespace: string[], itemId: string, byteStream: Readable, transformer?: Duplex): Promise<void>;
    getItem(namespace: string[], itemId: string): Promise<Readable>;
    deleteItem(namespace: string[], itemId: string): Promise<void>;
    deleteAllItems(namespace: string[]): Promise<void>;
    moveFile(
        oldNamespace: string[],
        oldItemId: string,
        newNamespace: string[],
        newItemId: string,
        callback: (error: Error | undefined) => void
    ): Promise<void>;
    itemExists(namespace: string[], itemId: string): Promise<boolean>;
    stop(): boolean;
    listItems(namespace: string[]): Promise<string[]>;
}
