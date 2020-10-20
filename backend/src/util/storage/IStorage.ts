import { Readable, Writable } from "stream";

export interface IStorageOptions {
    bucket: string;
}

export interface IStorage {
    bucketName: string;

    createObjectReadStream(path: string): Readable;
    createObjectWriteStream(path: string, filename?: string, mimeType?: string): Writable;
    uploadObject(path: string, data: any): Promise<void>;

    listObjects(prefix: string): Promise<string[]>;
    doesObjectExist(path: string): Promise<boolean>;
    downloadObject(path: string): Promise<Buffer>;

    // create a signed url that is valid for 8 days after the beginning of the
    // current week. Used 8 days to prevent issues around day 6 23:59:59
    signUrlWeek(path: string): Promise<string>;
    signUrl(path: string, expiresInMs?: number): Promise<string>;

    deleteObject(path: string): Promise<void>;
    moveObject(oldPath: string, newPath: string): Promise<void>;
}
