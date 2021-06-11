import { rejects } from "assert";
import { SemVer } from "semver";
import { Readable } from "stream";
import { Context } from "../../context";
import { PackageEntity } from "../../entity/PackageEntity";
import { Permission } from "../../generated/graphql";
import { getPackageFromCacheOrDbOrFail } from "../../resolvers/PackageResolver";
import { hasPackageEntityPermissions } from "../../resolvers/UserPackagePermissionResolver";
import { FileStorageService } from "../files/file-storage-service";
import { PackageFileStorageService } from "../packages/package-file-storage-service";

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

        const oldPackagePath = this.buildPackageNamespace(oldCatalogSlug, packageSlug);
        const newPackagePath = this.buildPackageNamespace(newCatalogSlug, packageSlug);

        return new Promise(
            async (res, rej) =>
                await this.fileStorageService
                    .moveFile(oldPackagePath, newPackagePath, (error: any) => {
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
        dataStream: Readable
    ): Promise<void> {
        // TODO: Validate that the data is in a valid avro format

        const packageEntity = await this.getPackage(context, catalogSlug, packageSlug);
        await this.validatePackageEditPermissions(context, packageEntity);
        await this.validatePackageSlug(packageEntity, version, sourceSlug);

        const namespace = this.buildDataNamespace(catalogSlug, packageSlug, version);
        return this.fileStorageService.writeFileFromStream(namespace, sourceSlug, dataStream);
    }

    public async readPackageDataFromStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string,
        sourceSlug: string
    ): Promise<Readable> {
        const packageEntity = await this.getPackage(context, catalogSlug, packageSlug);
        await this.validatePackageViewPermissions(context, packageEntity);
        await this.validatePackageSlug(packageEntity, version, sourceSlug);

        const namespace = this.buildDataNamespace(catalogSlug, packageSlug, version);
        return await this.fileStorageService.readFile(namespace, sourceSlug);
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

    private async validatePackageSlug(
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
            throw new Error("SLUG_NOT_FOUND");
        }
    }

    private buildDataNamespace(catalogSlug: string, packageSlug: string, version: string): string {
        return this.buildPackageNamespace(catalogSlug, packageSlug) + version + "/";
    }

    private buildPackageNamespace(catalogSlug: string, packageSlug: string): string {
        return this.buildCatalogNamespace(catalogSlug) + packageSlug + "/";
    }

    private buildCatalogNamespace(catalogSlug: string): string {
        return this.NAMESPACE + "/" + catalogSlug + "/";
    }
}
