import { DPMStorage } from "./dpm-storage";
import { Readable, Transform } from "stream";
import { DpmStorageStreamHolder } from "./dpm-storage-stream-holder";
import { StorageErrors } from "./files/file-storage-service";
import sanitize from "sanitize-filename";

import path from "path";
import fs from "fs-extra";

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

    public itemExists(namespace: string[], itemId: string): Promise<boolean> {
        const path = this.buildPath(namespace, itemId);
        const itemExistsInPath = this.itemExistsInAbsolutePath(path);
        return Promise.resolve(itemExistsInPath);
    }

    public deleteItem(namespace: string[], itemId: string): Promise<void> {
        const path = this.buildPath(namespace, itemId);

        if (!fs.existsSync(path)) {
            return Promise.resolve();
        }

        fs.unlinkSync(path);
        return Promise.resolve();
    }

    public async getItem(namespace: string[], itemId: string): Promise<Readable> {
        const path = this.buildPath(namespace, itemId);

        if (!fs.existsSync(path)) {
            throw new Error(StorageErrors.FILE_DOES_NOT_EXIST + ": " + path);
        }

        const readStream = fs.createReadStream(path);
        this.streamHelper.registerReadStream(readStream);
        return Promise.resolve(readStream);
    }

    public async writeStream(
        namespace: string[],
        itemId: string,
        byteStream: Readable,
        transformer?: Transform
    ): Promise<void> {
        this.createItemDirectoryIfMissing(namespace);
        const path = this.buildPath(namespace, itemId);
        const writeStream = fs.createWriteStream(path, {
            encoding: "utf8"
        });
        return this.streamHelper.copyToStream(byteStream, writeStream, transformer);
    }

    public async deleteAllItems(namespace: string[]): Promise<void> {
        const basePath = this.buildBasePath(namespace);
        if (!this.itemExistsInAbsolutePath(basePath)) {
            return;
        }

        fs.rmSync(basePath, {
            recursive: true
        });
    }

    public async listItems(namespace: string[]): Promise<string[]> {
        const basePath = this.buildBasePath(namespace);
        if (!this.itemExistsInAbsolutePath(basePath)) {
            return [];
        }

        return fs.readdirSync(basePath).map((f) => {
            const parts = f.split(path.sep);
            return parts[parts.length - 1];
        });
    }

    public async moveFile(
        oldNamespace: string[],
        oldItemId: string,
        newNamespace: string[],
        newItemId: string,
        callback?: (error: Error | undefined) => void
    ): Promise<void> {
        const oldFileFinalPath = this.buildPath(oldNamespace, oldItemId);
        if (!this.itemExistsInAbsolutePath(oldFileFinalPath)) {
            throw new Error(StorageErrors.FILE_DOES_NOT_EXIST + ": " + oldFileFinalPath);
        }

        const newFileFinalPath = this.buildPath(newNamespace, newItemId);
        return fs.move(oldFileFinalPath, newFileFinalPath, { overwrite: true }, (error) => {
            if (callback) {
                callback(error);
            }
        });
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

    private createItemDirectoryIfMissing(namespace: string[]): void {
        const path = this.buildBasePath(namespace);
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path, { recursive: true });
        }
    }

    private itemExistsInAbsolutePath(path: string): boolean {
        return fs.existsSync(path);
    }

    private buildPath(namespace: string[], itemId: string): string {
        const sanitizedItemId = sanitize(itemId);
        return [this.buildBasePath(namespace), sanitizedItemId].join(path.sep);
    }

    private buildBasePath(namespace: string[]): string {
        const sanitizedNamespace = namespace.map((n) => sanitize(n));
        return [this.SCHEMA_URL, ...sanitizedNamespace].join(path.sep);
    }
}
