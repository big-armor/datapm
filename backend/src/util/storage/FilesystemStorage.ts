import { IStorage, IStorageOptions } from "./IStorage";
import { Readable, Writable } from "stream";
import express from "express";

import fs from "fs";
import path from "path";
import mkdirp from "mkdirp";

let bucketHostingPrefix: string = "unset";

export function registerBucketHosting(app: express.Application, path: string, port: number, baseDir: string) {
    app.use(
        path,
        express.static(baseDir, {
            setHeaders: (res, path, stat) => {
                res.header("Access-Control-Allow-Origin", "*"); // sort CORS header
            }
        })
    );
    bucketHostingPrefix = `http://localhost:${port}/${path.replace("/", "")}`;
}

// recursively get all files in a directory
async function walk(dir: string): Promise<string[]> {
    let files = await fs.promises.readdir(dir);

    let objects: string[] = [];

    for (let file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
            objects = objects.concat(await walk(filePath));
        } else {
            objects.push(filePath);
        }
    }

    return objects;
}

async function cleanupOrphanedFolders(dir: string): Promise<void> {
    // get a list of all children of this directory
    let files = await fs.promises.readdir(dir);
    for (let file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
            // recurse within sub directories
            await cleanupOrphanedFolders(filePath);
        } else if (file === ".DS_Store") {
            // delete .DS_Store files
            await fs.promises.unlink(filePath);
        }
    }

    // recheck number of children in this directory (since we may have deleted some)
    if (files.length > 0) {
        files = await fs.promises.readdir(dir);
    }

    // delete folder if empty
    if (files.length === 0) {
        await fs.promises.rmdir(dir);
    }
}

async function ensureFolderExists(file: string): Promise<void> {
    await mkdirp(path.dirname(file));
}

function ensureFolderExistsSync(file: string) {
    mkdirp.sync(path.dirname(file));
}

export interface FileSystemStorageOptions extends IStorageOptions {
    baseDirectory: string;
}

export class FileSystemStorage implements IStorage {
    bucketName: string;
    private bucketPath: string;

    constructor(options: FileSystemStorageOptions) {
        this.bucketName = options.bucket;
        this.bucketPath = path.join(options.baseDirectory, this.bucketName);
    }

    private filePath(objectPath: string): string {
        const filePath = path.resolve(this.bucketPath, objectPath);
        const relative = path.relative(this.bucketPath, filePath);
        if (relative.startsWith(`..${path.sep}`)) {
            throw new Error(`Object path tries to escape bucket: ${objectPath} ${filePath} ${relative}`);
        }

        return filePath;
    }

    createObjectWriteStream(objectPath: string): Writable {
        const fullFile = this.filePath(objectPath);
        ensureFolderExistsSync(fullFile);
        return fs.createWriteStream(fullFile);
    }

    createObjectReadStream(objectPath: string): Readable {
        return fs.createReadStream(this.filePath(objectPath));
    }

    async uploadObject(objectPath: string, data: any): Promise<void> {
        const fullFile = this.filePath(objectPath);
        await ensureFolderExists(fullFile);
        await fs.promises.writeFile(fullFile, data);
    }

    async listObjects(prefix: string): Promise<string[]> {
        try {
            const files = await walk(this.filePath(prefix));
            return files.map((f) => f.replace(this.bucketPath + path.sep, ""));
        } catch (err) {
            return [];
        }
    }

    async doesObjectExist(objectPath: string): Promise<boolean> {
        try {
            const stat = await fs.promises.stat(this.filePath(objectPath));
            return stat.isFile();
        } catch (err) {
            return false;
        }
    }

    downloadObject(objectPath: string): Promise<Buffer> {
        return fs.promises.readFile(this.filePath(objectPath));
    }

    async signUrl(objectPath: string, expiresInMs?: number | undefined): Promise<string> {
        return this.signUrlWeek(objectPath);
    }

    async signUrlWeek(objectPath: string): Promise<string> {
        return `${bucketHostingPrefix}/${this.bucketName}/${objectPath}`;
    }

    async deleteObject(objectPath: string): Promise<void> {
        try {
            await fs.promises.unlink(this.filePath(objectPath));
            await cleanupOrphanedFolders(this.bucketPath).catch((e) => e);
        } catch (err) {
            console.warn(`Failed to delete object ${objectPath} - ${err}`);
        }
    }

    async moveObject(oldObject: string, newObject: string): Promise<void> {
        const newPath = this.filePath(newObject);
        await ensureFolderExists(newPath);
        await fs.promises.rename(this.filePath(oldObject), newPath);
    }
}
