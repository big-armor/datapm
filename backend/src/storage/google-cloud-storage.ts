import { DPMStorage } from "./dpm-storage";
import { Stream } from "stream";
import { Bucket, File, Storage } from "@google-cloud/storage";
import { DpmStorageStreamHolder } from "./dpm-storage-stream-holder";
import { fileURLToPath } from "url";

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

    public getItem(namespace: string, itemId: string): Promise<Stream> {
        this.ensureConnectionEstablished();
        const file = this.getBucketFile(namespace, itemId);
        const fileReadStream = file.createReadStream();
        return this.streamHelper.resolveReadStream(fileReadStream);
    }

    public writeItem(namespace: string, itemId: string, byteStream: Stream): Promise<void> {
        this.ensureConnectionEstablished();
        const file = this.getBucketFile(namespace, itemId);
        const writeStream = file.createWriteStream();
        return this.streamHelper.copyToStream(byteStream, writeStream);
    }

    public stop(): boolean {
        return this.streamHelper.destroyOpenStreams();
    }

    private getBucketFile(namespace: string, itemId: string): File {
        const filePath = this.buildPath(namespace, itemId);
        return this.bucket.file(filePath);
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
