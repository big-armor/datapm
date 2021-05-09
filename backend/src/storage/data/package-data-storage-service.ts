import { Readable } from "stream";
import { Context } from "../../context";
import { Permission } from "../../generated/graphql";
import { PackageRepository } from "../../repository/PackageRepository";
import { hasPackageEntityPermissions } from "../../resolvers/UserPackagePermissionResolver";
import { FileStorageService } from "../files/file-storage-service";

export class PackageDataStorageService {
    public static readonly INSTANCE = new PackageDataStorageService();

    private readonly NAMESPACE = "data";
    private readonly AVRO_FILE_EXTENSION = ".avro";

    private readonly fileStorageService = FileStorageService.INSTANCE;

    public async writePackageDataFromStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string,
        dataStream: Readable
    ): Promise<void> {
        // TODO: Validate that the data is in a valid avro format
        await this.validatePackageEditPermissions(context, catalogSlug, packageSlug);
        const namespace = this.buildDataNamespace(catalogSlug, packageSlug);
        const fileName = version + this.AVRO_FILE_EXTENSION;
        return this.fileStorageService.writeFileFromStream(namespace, fileName, dataStream);
    }

    public async readPackageDataFromStream(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        version: string
    ): Promise<Readable> {
        await this.validatePackageViewPermissions(context, catalogSlug, packageSlug);
        const namespace = this.buildDataNamespace(catalogSlug, packageSlug);
        const fileName = version + this.AVRO_FILE_EXTENSION;
        return await this.fileStorageService.readFile(namespace, fileName);
    }

    private async validatePackageEditPermissions(
        context: Context,
        catalogSlug: string,
        packageSlug: string
    ): Promise<void> {
        return this.validatePackagePermissions(context, catalogSlug, packageSlug, Permission.EDIT);
    }

    private async validatePackageViewPermissions(
        context: Context,
        catalogSlug: string,
        packageSlug: string
    ): Promise<void> {
        return this.validatePackagePermissions(context, catalogSlug, packageSlug, Permission.VIEW);
    }

    private async validatePackagePermissions(
        context: Context,
        catalogSlug: string,
        packageSlug: string,
        permission: Permission
    ): Promise<void> {
        const packageEntity = await context.connection.getCustomRepository(PackageRepository).findPackageOrFail({
            identifier: { catalogSlug: catalogSlug, packageSlug: packageSlug }
        });

        const hasPermissions = await hasPackageEntityPermissions(context, packageEntity, permission);
        if (!hasPermissions) {
            throw new Error("NOT_AUTHORIZED");
        }
    }

    private buildDataNamespace(catalogSlug: string, packageSlug: string): string {
        return this.NAMESPACE + "/" + catalogSlug + "/" + packageSlug + "/";
    }
}
