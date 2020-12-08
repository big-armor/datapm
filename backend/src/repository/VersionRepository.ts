import { EntityRepository, EntityManager } from "typeorm";
import { Version } from "../entity/Version";
import { VersionIdentifierInput, CreateVersionInput, PackageIdentifierInput } from "../generated/graphql";
import { PackageRepository } from "./PackageRepository";
import { SemVer } from "semver";
import { Maybe } from "graphql/jsutils/Maybe";
import { FileStorageService } from "../storage/files/file-storage-service";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";

@EntityRepository()
export class VersionRepository {
    readonly packageFileStorageService = PackageFileStorageService.INSTANCE;
    constructor(private manager: EntityManager) {}

    async save(userId: number, identifier: PackageIdentifierInput, value: CreateVersionInput) {
        const fileStorageService: FileStorageService = FileStorageService.INSTANCE;

        return await this.manager.nestedTransaction(async (transaction) => {
            const packageEntity = await transaction.getCustomRepository(PackageRepository).findOrFail({ identifier });

            let semVer = new SemVer(value.packageFile.version);

            let version = transaction.getRepository(Version).create({
                packageId: packageEntity.id,
                majorVersion: semVer.major,
                minorVersion: semVer.minor,
                patchVersion: semVer.patch,
                description: value.packageFile.description || undefined,
                authorId: userId,
                createdAt: new Date(),
                updatedAt: new Date(value.packageFile.updatedDate)
            });

            return await transaction.save(version);
        });
    }

    async findLatestVersion({
        identifier,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        relations?: string[];
    }): Promise<Maybe<Version>> {
        const ALIAS = "findLatestVersion";

        const packageRef = await this.manager.getCustomRepository(PackageRepository).findPackageOrFail({ identifier });

        return this.manager
            .getRepository(Version)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageRef.id })
            .orderBy({
                "findLatestVersion.majorVersion": "DESC",
                "findLatestVersion.minorVersion": "DESC",
                "findLatestVersion.patchVersion": "DESC"
            })
            .addRelations(ALIAS, relations)
            .getOne();
    }

    async findOneOrFail({
        identifier,
        relations = []
    }: {
        identifier: VersionIdentifierInput;
        relations?: string[];
    }): Promise<Version> {
        let packageEntity = await this.manager.getCustomRepository(PackageRepository).findOrFail({ identifier });

        let version = await this.manager.getRepository(Version).findOneOrFail({
            where: {
                packageId: packageEntity.id,
                majorVersion: identifier.versionMajor,
                minorVersion: identifier.versionMinor,
                patchVersion: identifier.versionPatch
            },
            relations: relations
        });

        if (!version) {
            throw new Error(
                `Version ${identifier.versionMajor}.${identifier.versionMinor}.${identifier.versionPatch} for package ${packageEntity.id} not found`
            );
        }

        return version;
    }

    async findVersions({ packageId, relations = [] }: { packageId: number; relations?: string[] }): Promise<Version[]> {
        const ALIAS = "versionsByPackageId";
        const versions = await this.manager
            .getRepository(Version)
            .createQueryBuilder(ALIAS)
            .where({ packageId })
            .addRelations(ALIAS, relations)
            .getMany();

        return versions;
    }

    async deleteVersions(versions: Version[]): Promise<void> {
        if (versions.length == 0) return;

        for (const version of versions) {
            const versionIdentifier: VersionIdentifierInput = {
                catalogSlug: version.package.catalog.slug,
                packageSlug: version.package.slug,
                versionMajor: version.majorVersion,
                versionMinor: version.minorVersion,
                versionPatch: version.patchVersion
            };
            try {
                await this.packageFileStorageService.deletePackageFile(version.package.id, versionIdentifier);
            } catch (error) {
                if (error.message.includes("FILE_DOES_NOT_EXIST")) return;

                console.error(error.message);
            }
        }

        await this.manager.nestedTransaction(async (transaction) => {
            for (const version of versions) await transaction.delete(Version, { id: version.id });
        });
    }
}
