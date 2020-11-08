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

    public async getItem(namespace: string, itemId: string): Promise<Stream> {
        const path = this.buildPath(namespace, itemId);

        console.log("reading file: " + path);

        if (!fs.existsSync(path)) throw new Error("FILE_NOT_FOUND");

        const readStream = fs.createReadStream(path);
        this.streamHelper.registerReadStream(readStream);
        return Promise.resolve(readStream);
    }

    public writeItem(namespace: string, itemId: string, byteStream: Stream, transformer?: any): Promise<void> {
        this.createItemDirectoryIfMissing(namespace);
        const path = this.buildPath(namespace, itemId);
        const writeStream = fs.createWriteStream(path);
        console.log("writing file: " + path);
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

    private createItemDirectoryIfMissing(namespace: string): void {
        const path = `${this.SCHEMA_URL}/${namespace}`;
        if (!fs.existsSync(path)) {
            console.log("creating directory: " + path);
            fs.mkdirSync(path, { recursive: true });
        }
    }

    private buildPath(namespace: string, itemId: string): string {
        return `${this.SCHEMA_URL}/${namespace}/${itemId}`;
    }
}
