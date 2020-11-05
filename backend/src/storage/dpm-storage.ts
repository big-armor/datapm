import * as Stream from "stream";

export interface DPMStorage {
    start(url: string): void;
    writeItem(namespace: string, itemId: string, byteStream: Stream, transformer?: any): Promise<void>;
    getItem(namespace: string, itemId: string): Promise<Stream>;
    deleteItem(namespace: string, itemId: string): Promise<void>;
    stop(): boolean;
}
