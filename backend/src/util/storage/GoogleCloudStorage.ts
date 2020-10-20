import { Storage, Bucket } from "@google-cloud/storage";
import moment from "moment";

import { IStorage, IStorageOptions } from "./IStorage";
import { Readable, Writable } from "stream";

export class GoogleCloudStorage implements IStorage {
    private readonly storage = new Storage();
    private readonly bucket: Bucket;

    readonly bucketName: string;

    constructor(options: IStorageOptions) {
        this.bucket = this.storage.bucket(options.bucket);
        this.bucketName = options.bucket;
    }

    createObjectReadStream(path: string): Readable {
        const file = this.bucket.file(path);
        return file.createReadStream();
    }

    createObjectWriteStream(path: string, filename?: string, mimeType?: string): Writable {
        const file = this.bucket.file(path);
        return file.createWriteStream({
            resumable: false,
            contentType: mimeType,
            metadata: {
                contentDisposition: filename ? `attachment; filename="${filename}"` : undefined
            }
        });
    }

    uploadObject(path: string, data: any): Promise<void> {
        const file = this.bucket.file(path);
        return file.save(data);
    }

    async listObjects(prefix: string): Promise<string[]> {
        const [dirListing] = await this.bucket.getFiles({
            autoPaginate: false,
            prefix
        });

        return dirListing.map((file) => file.name);
    }

    async doesObjectExist(path: string): Promise<boolean> {
        const file = this.bucket.file(path);
        const [response] = await file.exists();
        return response;
    }

    async downloadObject(path: string): Promise<Buffer> {
        const file = this.bucket.file(path);
        const [response] = await file.download();
        return response;
    }

    async signUrl(name: string, expiresInMs: number = 24 * 3600 * 1000): Promise<string> {
        const file = this.bucket.file(name);
        const res = await file.getSignedUrl({
            version: "v2",
            action: "read",
            expires: Date.now() + expiresInMs
        });

        if (res.length !== 1) {
            throw new Error(`Unexpected response when signing url. Result: ${JSON.stringify(res, null, 2)}`);
        }

        return res[0];
    }

    async signUrlWeek(name: string): Promise<string> {
        // create a signed url that is valid for 8 days after the beginning of the
        // current week. Used 8 days to prevent issues around day 6 23:59:59
        const expires = moment().day(0).hour(0).minute(0).second(0).millisecond(0).add(8, "days").toDate();

        const file = this.bucket.file(name);
        const res = await file.getSignedUrl({
            version: "v2",
            action: "read",
            expires: expires
        });

        if (res.length !== 1) {
            throw new Error(`Unexpected response when signing url. Result: ${JSON.stringify(res, null, 2)}`);
        }

        return res[0];
    }

    async deleteObject(path: string): Promise<void> {
        try {
            await this.bucket.file(path).delete();
        } catch (err) {
            if (!err || err.code !== 404) {
                throw err;
            }
        }
    }

    async moveObject(oldPath: string, newPath: string): Promise<void> {
        const file = this.bucket.file(oldPath);
        await file.move(newPath);
    }
}
