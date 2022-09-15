import { EntityRepository, EntityManager } from "typeorm";
import { VersionEntity } from "../entity/VersionEntity";
import { VersionIdentifierInput, CreateVersionInput, PackageIdentifierInput } from "../generated/graphql";
import { PackageRepository } from "./PackageRepository";
import { SemVer } from "semver";
import { Maybe } from "graphql/jsutils/Maybe";
import { FileStorageService } from "../storage/files/file-storage-service";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";
import { PackageFile } from "datapm-lib";

@EntityRepository()
export class VersionRepository {
    readonly packageFileStorageService = PackageFileStorageService.INSTANCE;
    // eslint-disable-next-line no-useless-constructor
    constructor(private manager: EntityManager) {
        // nothing to do
    }

    public async findVersion(
        packageId: number,
        majorVersion: number,
        minorVersion: number,
        patchVersion: number
    ): Promise<VersionEntity | undefined> {
        return this.manager
            .getRepository(VersionEntity)
            .createQueryBuilder()
            .where('"VersionEntity"."package_id" = :packageId')
            .andWhere('"VersionEntity"."majorVersion" = :majorVersion')
            .andWhere('"VersionEntity"."minorVersion" = :minorVersion')
            .andWhere('"VersionEntity"."patchVersion" = :patchVersion')
            .setParameter("packageId", packageId)
            .setParameter("majorVersion", majorVersion)
            .setParameter("minorVersion", minorVersion)
            .setParameter("patchVersion", patchVersion)
            .getOne();
    }

    async save(userId: number, identifier: PackageIdentifierInput, packageFile: PackageFile): Promise<VersionEntity> {
        // TODO this should probably be in the transaction
        // const fileStorageService: FileStorageService = FileStorageService.INSTANCE;

        return await this.manager.nestedTransaction(async (transaction) => {
            const packageEntity = await transaction.getCustomRepository(PackageRepository).findOrFail({ identifier });

            const semVer = new SemVer(packageFile.version);

            const updateMethods = packageFile.sources.flatMap((source) =>
                source.streamSets.flatMap((streamSet) => streamSet.updateMethods)
            );

            const version = transaction.getRepository(VersionEntity).create({
                packageId: packageEntity.id,
                majorVersion: semVer.major,
                minorVersion: semVer.minor,
                patchVersion: semVer.patch,
                description: packageFile.description || undefined,
                authorId: userId,
                createdAt: new Date(),
                updatedAt: new Date(packageFile.updatedDate),
                updateMethods
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
    }): Promise<Maybe<VersionEntity>> {
        const ALIAS = "findLatestVersion";

        const packageRef = await this.manager.getCustomRepository(PackageRepository).findPackageOrFail({ identifier });

        return this.manager
            .getRepository(VersionEntity)
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

    async findLatestVersionByMajorVersion({
        identifier,
        majorVersion,
        relations = []
    }: {
        identifier: PackageIdentifierInput;
        majorVersion: number;
        relations?: string[];
    }): Promise<Maybe<VersionEntity>> {
        const ALIAS = "findLatestVersion";

        const packageRef = await this.manager.getCustomRepository(PackageRepository).findPackageOrFail({ identifier });

        return this.manager
            .getRepository(VersionEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId: packageRef.id, majorVersion })
            .orderBy({
                "findLatestVersion.majorVersion": "DESC",
                "findLatestVersion.minorVersion": "DESC",
                "findLatestVersion.patchVersion": "DESC"
            })
            .addRelations(ALIAS, relations)
            .getOne();
    }

    async findLatestVersionByPackageId({
        packageId,
        relations = []
    }: {
        packageId: number;
        relations?: string[];
    }): Promise<Maybe<VersionEntity>> {
        const ALIAS = "findLatestVersion";
        return this.manager
            .getRepository(VersionEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId })
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
    }): Promise<VersionEntity> {
        const packageEntity = await this.manager.getCustomRepository(PackageRepository).findOrFail({ identifier });

        const version = await this.manager.getRepository(VersionEntity).findOneOrFail({
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
                `VERSION_NOT_FOUND ${identifier.versionMajor}.${identifier.versionMinor}.${identifier.versionPatch} for package ${packageEntity.id}`
            );
        }

        return version;
    }

    async findVersions({
        packageId,
        relations = []
    }: {
        packageId: number;
        relations?: string[];
    }): Promise<VersionEntity[]> {
        const ALIAS = "versionsByPackageId";
        const versions = await this.manager
            .getRepository(VersionEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId })
            .addRelations(ALIAS, relations)
            .getMany();

        return versions;
    }

    async findVersionsWithLimitAndOffset(
        packageId: number,
        offset: number,
        limit: number,
        relations?: string[]
    ): Promise<VersionEntity[]> {
        const ALIAS = "versionsByPackageId";
        const versions = await this.manager
            .getRepository(VersionEntity)
            .createQueryBuilder(ALIAS)
            .where({ packageId })
            .addRelations(ALIAS, relations)
            .offset(offset)
            .limit(limit)
            .orderBy({
                "versionsByPackageId.majorVersion": "DESC",
                "versionsByPackageId.minorVersion": "DESC",
                "versionsByPackageId.patchVersion": "DESC"
            })
            .getMany();

        return versions;
    }

    async deleteVersions(versions: VersionEntity[]): Promise<void> {
        if (versions.length === 0) return;

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
                if (error.message.includes("FILE_DOES_NOT_EXIST")) continue;

                console.error(error.message);
            }
        }

        await this.manager.nestedTransaction(async (transaction) => {
            for (const version of versions) await transaction.delete(VersionEntity, { id: version.id });
        });
    }
}
