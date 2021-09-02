import { SemVer } from "semver";
import { Readable } from "stream";
import { Context } from "../../context";
import { PackageEntity } from "../../entity/PackageEntity";
import { Permission } from "../../generated/graphql";
import { getPackageFromCacheOrDbOrFail } from "../../resolvers/PackageResolver";
import { hasPackageEntityPermissions } from "../../resolvers/UserPackagePermissionResolver";
import { FileStorageService } from "../files/file-storage-service";
import { PackageFileStorageService } from "../packages/package-file-storage-service";
import bufferPeek from "buffer-peek-stream";
import { TransformCallback } from "stream";
import avro from "avsc";


export enum UpdateMethod {
    REPLACE_ALL,
    APPEND
}

class BlockDecoder extends avro.streams.BlockDecoder {
    // eslint-disable-next-line
    _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
        callback(null, chunk);
    }

    _flush(callback: TransformCallback) {
        callback();
    }
}

export class PackageDataStorageService {
    public static readonly INSTANCE = new PackageDataStorageService();

    private readonly NAMESPACE = "data";

    private readonly fileStorageService = FileStorageService.INSTANCE;

    public async movePackageDataInNewCatalog(
        context: Context,
        oldCatalogSlug: string,
        newCatalogSlug: string,
        packageSlug: string
    ): Promise<void> {
        const packageEntity = await this.getPackage(context, oldCatalogSlug, packageSlug);
        await this.validatePackageManagePermissions(context, packageEntity);

        const oldCatalogNamespace = this.buildCatalogNamespace(oldCatalogSlug);
        const hasDataStored = await this.fileStorageService.fileExists(oldCatalogNamespace, packageSlug);
        if (!hasDataStored) {
            return;
        }

        return new Promise(
            async (res, rej) =>
                await this.fileStorageService
                    .moveFile([this.NAMESPACE,oldCatalogSlug], packageSlug,[this.NAMESPACE,newCatalogSlug],packageSlug,(error: any) => {
                        if (error) {
                            rej(error);
                        } else {
                            res();
                        }
                    })
                    .catch((e) => rej(e))
        );
    }

    public async writePackageDataFromStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string,
        sourceSlug: string,
        streamSetSlug: string,
        updateMethod: UpdateMethod,
        dataStream: Readable
    ): Promise<string> {
        // TODO: Validate that the data is in a valid avro format

        const packageEntity = await this.getPackage(context, catalogSlug, packageSlug);
        await this.validatePackageEditPermissions(context, packageEntity);
        await this.validatePackageSourceAndStreamSetSlug(packageEntity, version, sourceSlug, streamSetSlug);
        // TODO: Validate that the requester can upload to the given streamset

        // TODO: Validate that the provided AVRO is compatible with the given package schema
        const [rawFileBuffer, rawPeekStream] = await bufferPeek.promise(dataStream,Math.pow(2, 20));
        const blockDecoder = new BlockDecoder();
        Readable.from(rawFileBuffer).pipe(blockDecoder).on();
        

        const semVer = new SemVer(version);

        const namespace = this.buildStreamSetNamespace(catalogSlug, packageSlug, semVer.major, sourceSlug,streamSetSlug);

        const timestamp = new Date().getTime().toString();
        const fileName = timestamp + "-" + context.me?.id;

        if(updateMethod === UpdateMethod.REPLACE_ALL) {
            await this.fileStorageService.deleteFiles(namespace);
        }

        await this.fileStorageService.writeFileFromStream(namespace, fileName , dataStream);

        return timestamp;
    }

    public async getLatestFileNameForDataStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string,
        sourceSlug: string,
        streamSetSlug: string
    ): Promise<string | undefined> {
        const packageEntity = await this.getPackage(context, catalogSlug, packageSlug);

        await this.validatePackageViewPermissions(context, packageEntity);
        await this.validatePackageSourceAndStreamSetSlug(packageEntity, version, sourceSlug, streamSetSlug);
        const semVer = new SemVer(version);

        const namespace = this.buildStreamSetNamespace(catalogSlug, packageSlug, semVer.major, sourceSlug, streamSetSlug);

        const files = await this.fileStorageService.listFiles(namespace);

        if(files.length === 0) {
            throw new Error("STREAM_NOT_FOUND");
        }

        const sortableFiles = files.map((file) => {
            return {
            fileName: file,
            timestamp: parseInt(file.split("-")[0])
        }});

        return sortableFiles.sort((a,b) => a.fileName.localeCompare(b.fileName)).reverse()[0].fileName;

    }

    public async readPackageDataFromStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string,
        sourceSlug: string,
        streamSetSlug: string,
        offsetHash?: string
    ): Promise<{fileName: string, stream: Readable}> {
        const packageEntity = await this.getPackage(context, catalogSlug, packageSlug);
        await this.validatePackageViewPermissions(context, packageEntity);
        await this.validatePackageSourceAndStreamSetSlug(packageEntity, version, sourceSlug, streamSetSlug);

        const semVer = new SemVer(version);

        const namespace = this.buildStreamSetNamespace(catalogSlug, packageSlug, semVer.major, sourceSlug, streamSetSlug);

        const files = await this.fileStorageService.listFiles(namespace);

        let fileIndex = 0;

        if(offsetHash) {
            fileIndex = files.findIndex((file) => file.startsWith(offsetHash)) + 1 || 0;
        } 

        if(fileIndex >= files.length) {
            throw new Error("NO_NEW_DATA_AVAILABLE");
        }

        return {fileName: files[fileIndex], stream: await this.fileStorageService.readFile(namespace, files[fileIndex])};
    }

    private async getPackage(context: Context, catalogSlug: string, packageSlug: string): Promise<PackageEntity> {
        return await getPackageFromCacheOrDbOrFail(context, { catalogSlug, packageSlug });
    }

    private async validatePackageManagePermissions(context: Context, packageEntity: PackageEntity): Promise<void> {
        return this.validatePackagePermissions(context, packageEntity, Permission.MANAGE);
    }

    private async validatePackageEditPermissions(context: Context, packageEntity: PackageEntity): Promise<void> {
        return this.validatePackagePermissions(context, packageEntity, Permission.EDIT);
    }

    private async validatePackageViewPermissions(context: Context, packageEntity: PackageEntity): Promise<void> {
        return this.validatePackagePermissions(context, packageEntity, Permission.VIEW);
    }

    private async validatePackagePermissions(
        context: Context,
        packageEntity: PackageEntity,
        permission: Permission
    ): Promise<void> {
        const hasPermissions = await hasPackageEntityPermissions(context, packageEntity, permission);
        if (!hasPermissions) {
            throw new Error("NOT_AUTHORIZED");
        }
    }

    private async validatePackageSourceSlug(
        packageEntity: PackageEntity,
        version: string,
        sourceSlug: string
    ): Promise<void> {
        const semVer = new SemVer(version);
        const packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            catalogSlug: packageEntity.catalog.slug,
            packageSlug: packageEntity.slug,
            versionMajor: semVer.major,
            versionMinor: semVer.minor,
            versionPatch: semVer.patch
        });

        const slugExists = packageFile.sources.some((s) => s.slug === sourceSlug);
        if (!slugExists) {
            throw new Error("SOURCE_NOT_FOUND: " + sourceSlug);
        }
    }

    private async validatePackageSourceAndStreamSetSlug(
        packageEntity: PackageEntity,
        version: string,
        sourceSlug: string,
        streamSetSlug: string
    ): Promise<void> {
        const semVer = new SemVer(version);
        const packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            catalogSlug: packageEntity.catalog.slug,
            packageSlug: packageEntity.slug,
            versionMajor: semVer.major,
            versionMinor: semVer.minor,
            versionPatch: semVer.patch
        });

        const source = packageFile.sources.find((s) => s.slug === sourceSlug);
        if (!source) {
            throw new Error("SOURCE_NOT_FOUND: " + sourceSlug);
        }

        const streamSet = source.streamSets.find((s) => s.slug === streamSetSlug);
        if (!streamSet) {
            throw new Error("STREAM_SET_NOT_FOUND: " + streamSetSlug);
        }
    }

    private buildStreamSetNamespace(catalogSlug: string, packageSlug: string, majorVersion: number,sourceSlug:string, streamSetSlug: string): string[] {
        return [...this.buildSourceNamespace(catalogSlug, packageSlug, majorVersion, sourceSlug), streamSetSlug ];

    }

    private buildSourceNamespace(catalogSlug: string, packageSlug: string, majorVersion: number,sourceSlug:string): string[] {
        return [...this.buildVersionNamespace(catalogSlug, packageSlug, majorVersion), sourceSlug];

    }

    private buildVersionNamespace(catalogSlug: string, packageSlug: string, majorVersion: number): string[] {
        return [...this.buildPackageNamespace(catalogSlug, packageSlug), majorVersion.toString() ];
    }

    private buildPackageNamespace(catalogSlug: string, packageSlug: string): string[] {
        return [...this.buildCatalogNamespace(catalogSlug),packageSlug];
    }

    private buildCatalogNamespace(catalogSlug: string): string[] {
        return [this.NAMESPACE, catalogSlug];
    }
}
