import * as Stream from "stream";

export interface DPMStorage {
	start(url: string): void;
	writeItem(namespace: string, itemId: string, byteStream: Stream): Promise<void>;
	getItem(namespace: string, itemId: string): Promise<Stream>;
	stop(): boolean;
}
