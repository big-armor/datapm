import { DPMStorage } from "./dpm-storage";
import * as Stream from "stream";
import * as fs from "fs";
import crypto from "crypto";
import { DpmStorageStreamHolder } from "./dpm-storage-stream-holder";

export class FileStorage implements DPMStorage {
    public static readonly SCHEMA_URL_PREFIX = "file";

    private readonly SCHEMA_URL: string;
    private readonly streamHelper = new DpmStorageStreamHolder();

    public constructor(url: string) {
        this.start(url);
        this.SCHEMA_URL = url;
    }

    public start(url: string): void {
        if (!fs.existsSync(url)) {
            fs.mkdirSync(url, { recursive: true });
        }

        if (!FileStorage.hasReadWriteAccessInDirectory(url)) {
            throw new Error("Has Read/Write access to the filesystem in directory " + url);
        }
    }

    public deleteItem(namespace: string, itemId: string): Promise<void> {
        const path = this.buildPath(namespace, itemId);
        fs.unlinkSync(path);
        return Promise.resolve();
    }

    public getItem(namespace: string, itemId: string): Promise<Stream> {
        const path = this.buildPath(namespace, itemId);

        if (!fs.existsSync(path)) throw new Error("FILE_NOT_FOUND");

        const readStream = fs.createReadStream(path);
        this.streamHelper.registerReadStream(readStream);
        return Promise.resolve(readStream);
    }

    public writeItem(namespace: string, itemId: string, byteStream: Stream, transformer?: any): Promise<void> {
        const hash = this.hashItemId(itemId);
        this.createItemDirectoryIfMissing(namespace, hash);
        const path = this.buildPathWithHash(namespace, hash, itemId);
        const writeStream = fs.createWriteStream(path);
        return this.streamHelper.copyToStream(byteStream, writeStream, transformer);
    }

    public stop(): boolean {
        return this.streamHelper.destroyOpenStreams();
    }

    private static hasReadWriteAccessInDirectory(url: string): boolean {
        try {
            fs.accessSync(url, fs.constants.W_OK);
            fs.accessSync(url, fs.constants.R_OK);
            return true;
        } catch (exception) {
            return false;
        }
    }

    private createItemDirectoryIfMissing(namespace: string, hash: string): void {
        const path = `${this.SCHEMA_URL}/${namespace}/${hash}`;
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
        }
    }

    private buildPath(namespace: string, itemId: string): string {
        const hash = this.hashItemId(itemId);
        return this.buildPathWithHash(namespace, hash, itemId);
    }

    private buildPathWithHash(namespace: string, hash: string, itemId: string): string {
        return `${this.SCHEMA_URL}/${namespace}/${hash}/${itemId}`;
    }

    private hashItemId(itemId: string): string {
        return crypto.createHash("md5").update(itemId).digest("hex").substr(0, 3);
    }
}
