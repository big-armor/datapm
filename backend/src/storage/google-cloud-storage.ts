import { DPMStorage } from "./dpm-storage";
import { Stream, Readable } from "stream";
import { Bucket, File, Storage } from "@google-cloud/storage";
import { DpmStorageStreamHolder } from "./dpm-storage-stream-holder";
import { fileURLToPath } from "url";
import { StorageErrors } from "./files/file-storage-service";

export class GoogleCloudStorage implements DPMStorage {
    public static readonly SCHEMA_URL_PREFIX = "gs";
    private static readonly PATH_SPLITTER = "/";

    private readonly storage: Storage;
    private readonly streamHelper = new DpmStorageStreamHolder();

    private bucket: Bucket;
    private pathPrefix: string;

    public constructor(url: string) {
        this.storage = new Storage();
        this.start(url);
    }

    public start(url: string): void {
        const urlParts = url.split(GoogleCloudStorage.PATH_SPLITTER);
        if (!urlParts.length) {
            throw new Error("Google Storage bucket name not specified");
        }

        const bucketName = urlParts[0];
        if (urlParts.length > 1) {
            this.pathPrefix = urlParts.slice(1).join(GoogleCloudStorage.PATH_SPLITTER);
        }
        this.bucket = this.storage.bucket(bucketName);
        this.ensureConnectionEstablished();
    }

    public async deleteItem(namespace: string, itemId: string) {
        this.ensureConnectionEstablished();
        const file = await this.getBucketFile(namespace, itemId);

        const fileExists = await file.exists();
        if (!fileExists[0]) throw new Error(StorageErrors.FILE_DOES_NOT_EXIST.toString());

        await file.delete();
    }

    public async getItem(namespace: string, itemId: string): Promise<Readable> {
        this.ensureConnectionEstablished();
        const file = await this.getBucketFile(namespace, itemId);

        const fileExists = await file.exists();
        if (!fileExists[0]) throw new Error(StorageErrors.FILE_DOES_NOT_EXIST.toString());

        const fileReadStream = file.createReadStream();
        this.streamHelper.registerReadStream(fileReadStream);
        return Promise.resolve(fileReadStream);
    }

    public async writeItem(namespace: string, itemId: string, byteStream: Readable, transformer?: any): Promise<void> {
        this.ensureConnectionEstablished();
        const file = await this.getBucketFile(namespace, itemId);
        const writeStream = file.createWriteStream();
        return this.streamHelper.copyToStream(byteStream, writeStream, transformer);
    }

    public stop(): boolean {
        return this.streamHelper.destroyOpenStreams();
    }

    private async getBucketFile(namespace: string, itemId: string): Promise<File> {
        const filePath = this.buildPath(namespace, itemId);

        const file = this.bucket.file(filePath);

        return file;
    }

    private buildPath(namespace: string, itemId: string): string {
        const itemPath = `${namespace}/${itemId}`;
        if (!this.pathPrefix) {
            return itemPath;
        }

        return `${this.pathPrefix}/${itemPath}`;
    }

    private ensureConnectionEstablished(): void {
        if (!this.bucket) {
            throw new Error("Google Cloud Storage connection not initialized");
        }
    }
}
