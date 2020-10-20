import { Readable } from "stream";
import { Application } from "express";
import { FileUpload } from "graphql-upload";

import { IStorage, IStorageOptions } from "./IStorage";
import { FileSystemStorage, registerBucketHosting as _registerBucketHosting } from "./FilesystemStorage";
import { GoogleCloudStorage } from "./GoogleCloudStorage";
import { getEnvVariable } from "../getEnvVariable";

const fileSystemStorageDirectory = process.env.FILESYSTEM_STORAGE_DIRECTORY;

export function createStorage(options: IStorageOptions): IStorage {
    if (fileSystemStorageDirectory) {
        return new FileSystemStorage({
            ...options,
            baseDirectory: fileSystemStorageDirectory
        });
    } else {
        return new GoogleCloudStorage(options);
    }
}

export const mediaStorage = createStorage({
    bucket: getEnvVariable("GCLOUD_STORAGE_BUCKET_NAME")
});

export function uploadFile(storage: IStorage, fileUpload: FileUpload, path: string): Promise<void> {
    return uploadStream(storage, fileUpload.createReadStream(), path, fileUpload.mimetype, fileUpload.filename);
}

export function uploadStream(
    storage: IStorage,
    stream: Readable,
    path: string,
    mimeType?: string,
    filename?: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        stream
            .pipe(storage.createObjectWriteStream(path, filename, mimeType))
            .on("warn", (warn) => console.log(warn))
            .on("error", (err) => reject(err))
            .on("finish", () => resolve());
    });
}

export function registerBucketHosting(app: Application, path: string, port: number) {
    if (fileSystemStorageDirectory) {
        _registerBucketHosting(app, path, port, fileSystemStorageDirectory);
    }
}
