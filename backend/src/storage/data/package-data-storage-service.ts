import { SemVer } from "semver";
import { Readable } from "stream";
import { Context } from "../../context";
import { PackageEntity } from "../../entity/PackageEntity";
import { Permission } from "../../generated/graphql";
import { PackageRepository } from "../../repository/PackageRepository";
import { hasPackageEntityPermissions } from "../../resolvers/UserPackagePermissionResolver";
import { FileStorageService } from "../files/file-storage-service";
import { PackageFileStorageService } from "../packages/package-file-storage-service";

export class PackageDataStorageService {
    public static readonly INSTANCE = new PackageDataStorageService();

    private readonly NAMESPACE = "data";

    private readonly fileStorageService = FileStorageService.INSTANCE;

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
        await this.validatePackageEditPermissions(context, packageEntity);
        await this.validatePackageSlug(packageEntity, version, sourceSlug);

        const namespace = this.buildDataNamespace(catalogSlug, packageSlug, version);
        return await this.fileStorageService.readFile(namespace, sourceSlug);
    }

    private async getPackage(context: Context, catalogSlug: string, packageSlug: string): Promise<PackageEntity> {
        return context.connection.getCustomRepository(PackageRepository).findPackageOrFail({
            identifier: { catalogSlug: catalogSlug, packageSlug: packageSlug }
        });
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
        return this.NAMESPACE + "/" + catalogSlug + "/" + packageSlug + "/" + version + "/";
    }
}
