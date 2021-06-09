import { SemVer } from "semver";
import {
    compatibilityToString,
    comparePackages,
    diffCompatibility,
    nextVersion,
    PackageFile,
    Compability,
    upgradePackageFile,
    Difference
} from "datapm-lib";
import { VersionRepository } from "./../repository/VersionRepository";
import { PackageFileStorageService } from "./../storage/packages/package-file-storage-service";
import { AuthenticatedContext, Context } from "./../context";
import {
    ActivityLogChangeType,
    ActivityLogEventType,
    CreateVersionInput,
    Package,
    PackageIdentifierInput,
    Permission,
    User,
    Version,
    VersionConflict,
    VersionIdentifier,
    VersionIdentifierInput
} from "../generated/graphql";
import { ApolloError } from "apollo-server";
import { PackageRepository } from "../repository/PackageRepository";
import { getGraphQlRelationName } from "./../util/relationNames";
import { VersionEntity } from "../entity/VersionEntity";
import { createActivityLog } from "./../repository/ActivityLogRepository";
import { getCatalogFromCacheOrDbByIdOrFail } from "./CatalogResolver";
import { StorageErrors } from "../storage/files/file-storage-service";
import { hasPackagePermissions } from "./UserPackagePermissionResolver";
import { getPackageFromCacheOrDbById, packageEntityToGraphqlObject } from "./PackageResolver";
import { saveVersionComparison } from "../repository/VersionComparisonRepository";
import { Connection, EntityManager } from "typeorm";

export const versionEntityToGraphqlObject = async (
    context: Context,
    connection: EntityManager | Connection,
    versionEntity: VersionEntity
): Promise<Version> => {
    let packageSlug: string;
    let catalogSlug: string;

    const packageEntity = await getPackageFromCacheOrDbById(context, connection, versionEntity.packageId);
    packageSlug = packageEntity.slug;

    if (versionEntity.package?.catalog != null) {
        catalogSlug = versionEntity.package.catalog.slug;
    } else if (packageEntity.catalog != null) {
        catalogSlug = packageEntity.catalog.slug;
    } else {
        const catalogEntity = await getCatalogFromCacheOrDbByIdOrFail(context, connection, packageEntity.catalogId);
        catalogSlug = catalogEntity.slug;
    }

    return {
        identifier: {
            registryURL: process.env["REGISTRY_URL"]!,
            catalogSlug: catalogSlug,
            packageSlug: packageSlug,
            versionMajor: versionEntity.majorVersion,
            versionMinor: versionEntity.minorVersion,
            versionPatch: versionEntity.patchVersion
        }
    };
};

export const createVersion = async (
    _0: any,
    { identifier, value }: { identifier: PackageIdentifierInput; value: CreateVersionInput },
    context: AuthenticatedContext,
    info: any
) => {
    let latestVersion: VersionEntity | undefined | null;
    let savedVersion: VersionEntity | undefined | null;
    let diff: Difference[] | null = null;

    const transactionResult = await context.connection.manager.nestedTransaction(async (transaction) => {
        const proposedNewVersion = new SemVer(value.packageFile.version);

        const rawPackageFile = value.packageFile as PackageFile;

        const newPackageFile = upgradePackageFile(rawPackageFile);

        // get the latest version
        latestVersion = await transaction
            .getCustomRepository(VersionRepository)
            .findLatestVersion({ identifier, relations: ["package"] });

        let changeType = ActivityLogChangeType.VERSION_FIRST_VERSION;

        if (latestVersion != null) {
            let packageFile;
            try {
                packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(latestVersion.package.id, {
                    ...identifier,
                    versionMajor: latestVersion.majorVersion,
                    versionMinor: latestVersion.minorVersion,
                    versionPatch: latestVersion.patchVersion
                });
            } catch (error) {
                throw new ApolloError("INTERNAL_SERVER_ERROR");
            }

            const latestVersionSemVer = new SemVer(packageFile!.version);

            diff = comparePackages(packageFile, newPackageFile);

            const compatibility = diffCompatibility(diff);

            const minNextVersion = nextVersion(latestVersionSemVer, compatibility);

            const minVersionCompare = minNextVersion.compare(proposedNewVersion.version);

            if (compatibility == Compability.Identical) {
                changeType = ActivityLogChangeType.VERSION_TRIVIAL_CHANGE;
                latestVersion.updatedAt = new Date();
                savedVersion = await transaction.getRepository(VersionEntity).save(latestVersion);
            } else {
                if (minVersionCompare == 1) {
                    throw new ApolloError(
                        identifier.catalogSlug +
                            "/" +
                            identifier.packageSlug +
                            " has current version " +
                            latestVersionSemVer.version +
                            ", and this new version has " +
                            compatibilityToString(compatibility) +
                            " changes - requiring a minimum version number of " +
                            minNextVersion.version +
                            ", but you submitted version number " +
                            proposedNewVersion.version,
                        VersionConflict.HIGHER_VERSION_REQUIRED,
                        { existingVersion: latestVersionSemVer.version, minNextVersion: minNextVersion.version }
                    );
                } else if (compatibility == Compability.MinorChange) {
                    changeType = ActivityLogChangeType.VERSION_PATCH_CHANGE;
                } else if (compatibility == Compability.CompatibleChange) {
                    changeType = ActivityLogChangeType.VERSION_MINOR_CHANGE;
                } else if (compatibility == Compability.BreakingChange) {
                    changeType = ActivityLogChangeType.VERSION_MAJOR_CHANGE;
                }

                savedVersion = await transaction
                    .getCustomRepository(VersionRepository)
                    .save(context.me.id, identifier, value);
            }
        } else {
            savedVersion = await transaction
                .getCustomRepository(VersionRepository)
                .save(context.me.id, identifier, value);
        }

        const versionIdentifier = {
            ...identifier,
            versionMajor: proposedNewVersion.major,
            versionMinor: proposedNewVersion.minor,
            versionPatch: proposedNewVersion.patch
        };

        const packageEntity = await transaction.getCustomRepository(PackageRepository).findOrFail({ identifier });

        await transaction
            .getCustomRepository(PackageRepository)
            .updatePackageReadmeVectors(identifier, newPackageFile.readmeMarkdown);

        const ALIAS = "findVersion";
        const recalledVersion = await transaction
            .getRepository(VersionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, getGraphQlRelationName(info))
            .where({ id: savedVersion.id })
            .getOne();

        if (recalledVersion === undefined)
            throw new Error("Could not find the version after saving. This should never happen!");

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType:
                changeType === ActivityLogChangeType.VERSION_TRIVIAL_CHANGE
                    ? ActivityLogEventType.VERSION_UPDATED
                    : ActivityLogEventType.VERSION_CREATED,
            changeType,
            targetPackageVersionId: savedVersion?.id,
            targetPackageId: packageEntity.id
        });

        if (latestVersion && diff && diff.length > 0 && savedVersion && latestVersion.id !== savedVersion.id) {
            await saveVersionComparison(transaction, savedVersion.id, latestVersion.id, diff);
        }

        if (value.packageFile)
            await PackageFileStorageService.INSTANCE.writePackageFile(
                packageEntity.id,
                versionIdentifier,
                value.packageFile
            );

        return versionEntityToGraphqlObject(context, transaction, recalledVersion);
    });

    return transactionResult;
};

export const deleteVersion = async (
    _0: any,
    { identifier }: { identifier: VersionIdentifierInput },
    context: AuthenticatedContext
): Promise<void> => {
    return await context.connection.transaction(async (transaction) => {
        const version = await transaction.getCustomRepository(VersionRepository).findOneOrFail({ identifier });

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.VERSION_DELETED,
            targetPackageVersionId: version.id,
            targetPackageId: version.packageId
        });

        await transaction.delete(VersionEntity, { id: version.id });
    });
};

export const versionPackageFile = async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
    const version = await getPackageVersionFromCacheOrDbByIdentifier(context, parent.identifier);
    const packageEntity = await getPackageFromCacheOrDbById(context, context.connection, version.packageId);

    try {
        return await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            catalogSlug: packageEntity.catalog.slug,
            packageSlug: packageEntity.slug,
            versionMajor: version.majorVersion,
            versionMinor: version.minorVersion,
            versionPatch: version.patchVersion
        });
    } catch (error) {
        if (error.message.includes(StorageErrors.FILE_DOES_NOT_EXIST.toString())) {
            throw new Error("PACKAGE_FILE_NOT_FOUND");
        }

        throw error;
    }
};

export const versionAuthor = async (
    parent: Version,
    _1: any,
    context: AuthenticatedContext,
    info: any
): Promise<User | null> => {
    const version = await getPackageVersionFromCacheOrDbByIdentifier(context, parent.identifier, ["author"], true);
    if (!(await hasPackagePermissions(context, version.packageId, Permission.VIEW))) {
        return null;
    }
    return version.author;
};

export const versionIdentifier = (
    parent: Version,
    _1: any,
    context: AuthenticatedContext,
    info: any
): VersionIdentifier => {
    return parent.identifier;
};

export const versionCreatedAt = async (
    parent: Version,
    _1: any,
    context: AuthenticatedContext,
    info: any
): Promise<Date | null> => {
    const version = await getPackageVersionFromCacheOrDbByIdentifier(context, parent.identifier);
    if (!(await hasPackagePermissions(context, version.packageId, Permission.VIEW))) {
        return null;
    }

    return version.createdAt;
};

export const versionUpdatedAt = async (
    parent: Version,
    _1: any,
    context: AuthenticatedContext,
    info: any
): Promise<Date | null> => {
    const version = await getPackageVersionFromCacheOrDbByIdentifier(context, parent.identifier);
    if (!(await hasPackagePermissions(context, version.packageId, Permission.VIEW))) {
        return null;
    }

    return version.updatedAt;
};

export const versionPackage = async (
    parent: Version,
    _1: any,
    context: AuthenticatedContext,
    info: any
): Promise<Package | null> => {
    const version = await getPackageVersionFromCacheOrDbByIdentifier(context, parent.identifier);
    return packageEntityToGraphqlObject(context, context.connection, version.package);
};

export const getPackageVersionFromCacheOrDbByIdentifier = async (
    context: Context,
    identifier: VersionIdentifierInput,
    relations?: string[],
    forceReload?: boolean
) => {
    const versionPromiseFunction = () =>
        context.connection.getCustomRepository(VersionRepository).findOneOrFail({ identifier, relations });

    return await context.cache.loadPackageVersion(identifier, versionPromiseFunction, forceReload);
};
