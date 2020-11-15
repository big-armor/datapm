import { Stream, Readable } from "stream";

export interface DPMStorage {
    start(url: string): void;
    writeItem(namespace: string, itemId: string, byteStream: Readable, transformer?: any): Promise<void>;
    getItem(namespace: string, itemId: string): Promise<Readable>;
    deleteItem(namespace: string, itemId: string): Promise<void>;
    stop(): boolean;
}
