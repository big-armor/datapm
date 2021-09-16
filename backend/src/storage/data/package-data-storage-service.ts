import { SemVer } from "semver";
import { Readable, TransformCallback } from "stream";
import { Context } from "../../context";
import { PackageEntity } from "../../entity/PackageEntity";
import { Permission } from "../../generated/graphql";
import { getPackageFromCacheOrDbOrFail } from "../../resolvers/PackageResolver";
import { hasPackageEntityPermissions } from "../../resolvers/UserPackagePermissionResolver";
import { FileStorageService } from "../files/file-storage-service";
import { PackageFileStorageService } from "../packages/package-file-storage-service";
import bufferPeek from "buffer-peek-stream";

import avro, { schema, Type } from "avsc";
import { PackageFile, base62, DPM_AVRO_DOC_URL_V1 } from "datapm-lib";

export enum UpdateMethod {
    REPLACE_ALL, // for editors
    REPLACE_ALL_MINE, // for contributors
    APPEND_TO_MINE // for editors and contributors
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
                    .moveFile(
                        [this.NAMESPACE, oldCatalogSlug],
                        packageSlug,
                        [this.NAMESPACE, newCatalogSlug],
                        packageSlug,
                        (error: any) => {
                            if (error) {
                                rej(error);
                            } else {
                                res();
                            }
                        }
                    )
                    .catch((e) => rej(e))
        );
    }

    public async writePackageDataFromStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string,
        sourceSlug: string,
        streamSetAndSchemaSlug: string,
        updateMethod: UpdateMethod,
        dataStream: Readable,
        streamLength?: number
    ): Promise<string> {


        const packageEntity = await this.getPackage(context, catalogSlug, packageSlug);
        await this.validatePackageEditPermissions(context, packageEntity);

        const semVer = new SemVer(version);
        const packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            catalogSlug: packageEntity.catalog.slug,
            packageSlug: packageEntity.slug,
            versionMajor: semVer.major,
            versionMinor: semVer.minor,
            versionPatch: semVer.patch
        });

        await this.validatePackageSourceAndSchemaSlug(packageFile, sourceSlug, streamSetAndSchemaSlug);


        const contentLength = streamLength ? streamLength : Number.MAX_VALUE;

        const maxBufferSize = Math.pow(2, 20);
        const bufferSize = maxBufferSize < contentLength ? maxBufferSize : contentLength;

        const avroSchema = await new Promise<schema.RecordType>(async (resolve, reject) => {
            const [rawFileBuffer, rawPeekStream] = await bufferPeek.promise(dataStream, bufferSize);
            const blockDecoder = new BlockDecoder();
            const avroBlockDecoder = Readable.from(rawFileBuffer).pipe(blockDecoder);
    
            avroBlockDecoder.on("metadata",(type:schema.RecordType) => {
                console.log(JSON.stringify(type,null,1));
                resolve(type);
            })

            avroBlockDecoder.on("error", (error) => {

                if(error.message.includes("invalid magic bytes"))
                    reject(new Error("Not an AVRO file"))
                else reject(error);
            });
           
        });

        if(avroSchema.doc !== DPM_AVRO_DOC_URL_V1) {
            throw new Error("AVRO_DOC_VALUE_NOT_RECOGNIZED: " + avroSchema.doc);
        }
        
        const packageSchema = packageFile.schemas.find((s) => s.title === streamSetAndSchemaSlug);

        if(packageSchema == undefined)
            throw new Error("SCHEMA_NOT_FOUND: " + streamSetAndSchemaSlug);

        if(packageSchema.properties == undefined)
            throw new Error("SCHEMA_HAS_NO_FIELDS: " + streamSetAndSchemaSlug);


        const schemaProperties = packageSchema.properties || {};

        const schemaPropertyKeys = Object.keys(schemaProperties);

        const avroFieldNameTypes = avroSchema.fields.map((field) => {

            const fieldNameParts = field.name.split("_");
            return {
                name: base62.decodeBase62(fieldNameParts[1]),
                type: fieldNameParts[2]
            }
        });

        const missingSchemaProperties = avroFieldNameTypes.filter((field) => {
            return !schemaPropertyKeys.find((f) => f === field.name);
        });

        if(missingSchemaProperties.length > 0) {
            throw new Error("FIELD_NOT_PRESENT_IN_SCHEMA: " + missingSchemaProperties.map(f => f.name).join(","));
        }

        const missingAvroProperties = schemaPropertyKeys.filter((schemaPropertyKey) => {
            return !avroFieldNameTypes.find((f) => f.name === schemaPropertyKey);
        });

        if(missingAvroProperties.length > 0) {
            throw new Error("FIELD_NOT_PRESENT_IN_UPLOAD: " + missingAvroProperties.join(","));
        }

        const namespace = this.buildStreamSetNamespace(
            catalogSlug,
            packageSlug,
            semVer.major,
            sourceSlug,
            streamSetAndSchemaSlug
        );

        const timestamp = new Date().getTime().toString();
        const fileName = timestamp + "-" + context.me?.id;

        if (updateMethod === UpdateMethod.REPLACE_ALL) {
            await this.fileStorageService.deleteFiles(namespace);
        } else if(updateMethod === UpdateMethod.REPLACE_ALL_MINE) {
        
            // Find the list of files that are mine
            const files = await this.fileStorageService.listFiles(namespace);

            const myId = context.me!.id.toString();

            const myFiles = files.filter((file) => {
                return file.includes(myId);
            });

            await this.fileStorageService.deleteFiles(namespace, myFiles);

        }

        await this.fileStorageService.writeFileFromStream(namespace, fileName, dataStream);

        return timestamp;
    }

    public async getLatestFileNameForDataStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string,
        sourceSlug: string,
        streamSetAndSchemaSlug: string
    ): Promise<string | undefined> {
        const packageEntity = await this.getPackage(context, catalogSlug, packageSlug);

        await this.validatePackageViewPermissions(context, packageEntity);


        const semVer = new SemVer(version);
        const packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            catalogSlug: packageEntity.catalog.slug,
            packageSlug: packageEntity.slug,
            versionMajor: semVer.major,
            versionMinor: semVer.minor,
            versionPatch: semVer.patch
        });


        await this.validatePackageSourceAndSchemaSlug(packageFile,  sourceSlug, streamSetAndSchemaSlug);

        const namespace = this.buildStreamSetNamespace(
            catalogSlug,
            packageSlug,
            semVer.major,
            sourceSlug,
            streamSetAndSchemaSlug
        );

        const files = await this.fileStorageService.listFiles(namespace);

        if (files.length === 0) {
            throw new Error("STREAM_NOT_FOUND");
        }

        const sortableFiles = files.map((file) => {
            return {
                fileName: file,
                timestamp: parseInt(file.split("-")[0])
            };
        });

        return sortableFiles.sort((a, b) => a.fileName.localeCompare(b.fileName)).reverse()[0].fileName;
    }

    public async readPackageDataFromStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string,
        sourceSlug: string,
        streamSetAndSchemaSlug: string,
        offsetHash?: string
    ): Promise<{ fileName: string; stream: Readable }> {
        const packageEntity = await this.getPackage(context, catalogSlug, packageSlug);
        await this.validatePackageViewPermissions(context, packageEntity);

        const semVer = new SemVer(version);
        const packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            catalogSlug: packageEntity.catalog.slug,
            packageSlug: packageEntity.slug,
            versionMajor: semVer.major,
            versionMinor: semVer.minor,
            versionPatch: semVer.patch
        });

        await this.validatePackageSourceAndSchemaSlug(packageFile, sourceSlug, streamSetAndSchemaSlug);

        const namespace = this.buildStreamSetNamespace(
            catalogSlug,
            packageSlug,
            semVer.major,
            sourceSlug,
            streamSetAndSchemaSlug
        );

        const files = await this.fileStorageService.listFiles(namespace);

        let fileIndex = 0;

        if (offsetHash) {
            fileIndex = files.findIndex((file) => file.startsWith(offsetHash)) + 1 || 0;
        }

        if (fileIndex >= files.length) {
            throw new Error("NO_NEW_DATA_AVAILABLE");
        }

        return {
            fileName: files[fileIndex],
            stream: await this.fileStorageService.readFile(namespace, files[fileIndex])
        };
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

    private async validatePackageSourceAndSchemaSlug(
        packageFile: PackageFile,
        sourceSlug: string,
        streamSetAndSchemaSlug: string
    ): Promise<void> {


        const source = packageFile.sources.find((s) => s.slug === sourceSlug);
        if (!source) {
            throw new Error("SOURCE_NOT_FOUND: " + sourceSlug);
        }

        // Do not check the streamSet slug, becuase the original stream set in the package file
        // is from a different source (like a database or web server). 
        // Here were are simply checking that the requested schema is present
        // The registry will respond to the consuming client with a modified package file
        // that contians a streamSet pointed at the registry - where each schema is a streamSet

        const schema = packageFile.schemas.find((s) => s.title === streamSetAndSchemaSlug);

        if(!schema) {
            throw new Error("SCHEMA_NOT_FOUND: " + streamSetAndSchemaSlug);
        }
    }

    private buildStreamSetNamespace(
        catalogSlug: string,
        packageSlug: string,
        majorVersion: number,
        sourceSlug: string,
        streamSetSlug: string
    ): string[] {
        return [...this.buildSourceNamespace(catalogSlug, packageSlug, majorVersion, sourceSlug), streamSetSlug];
    }

    private buildSourceNamespace(
        catalogSlug: string,
        packageSlug: string,
        majorVersion: number,
        sourceSlug: string
    ): string[] {
        return [...this.buildVersionNamespace(catalogSlug, packageSlug, majorVersion), sourceSlug];
    }

    private buildVersionNamespace(catalogSlug: string, packageSlug: string, majorVersion: number): string[] {
        return [...this.buildPackageNamespace(catalogSlug, packageSlug), majorVersion.toString()];
    }

    private buildPackageNamespace(catalogSlug: string, packageSlug: string): string[] {
        return [...this.buildCatalogNamespace(catalogSlug), packageSlug];
    }

    private buildCatalogNamespace(catalogSlug: string): string[] {
        return [this.NAMESPACE, catalogSlug];
    }
}
