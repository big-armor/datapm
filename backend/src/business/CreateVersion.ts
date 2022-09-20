import { ApolloError } from "apollo-server";
import {
    ActivityLogChangeType,
    ActivityLogEventType,
    CreateVersionInput,
    PackageIdentifierInput,
    VersionConflict
} from "datapm-client-lib";
import {
    Compability,
    comparePackages,
    compatibilityToString,
    diffCompatibility,
    Difference,
    nextVersion,
    PackageFile,
    PublishMethod,
    upgradePackageFile
} from "datapm-lib";
import { SemVer } from "semver";
import { AuthenticatedContext } from "../context";
import { VersionEntity } from "../entity/VersionEntity";
import { Version } from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { saveVersionComparison } from "../repository/VersionComparisonRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { versionEntityToGraphqlObject } from "../resolvers/VersionResolver";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";
import { getEnvVariable } from "../util/getEnvVariable";

export async function createOrUpdateVersion(
    context: AuthenticatedContext,
    packageIdentifier: PackageIdentifierInput,
    value: CreateVersionInput,
    returnRelations: string[]
): Promise<Version> {
    let latestVersion: VersionEntity | undefined | null;
    let savedVersion: VersionEntity | undefined | null;
    let diff: Difference[] | null = null;

    const transactionResult = await context.connection.manager.nestedTransaction(async (transaction) => {
        const proposedNewVersion = new SemVer(value.packageFile.version);

        const rawPackageFile = value.packageFile as PackageFile;

        const newPackageFile = upgradePackageFile(rawPackageFile);

        const registryReference = newPackageFile.registries?.find(
            (registry) => registry.url === getEnvVariable("REGISTRY_URL")
        );

        const publishMethod = registryReference?.publishMethod || PublishMethod.SCHEMA_ONLY;

        if (publishMethod === PublishMethod.SCHEMA_PROXY_DATA) {
            // TODO check that the referenced credentials are available
            // TODO check that the data can be accessed
        } else if (publishMethod === PublishMethod.SCHEMA_ONLY) {
            // TODO check that the data can be accessed??? (or maybe it doesn't matter until they try to set it public)
        }

        // get the latest version
        latestVersion = await transaction
            .getCustomRepository(VersionRepository)
            .findLatestVersion({ identifier: packageIdentifier, relations: ["package"] });

        let changeType = ActivityLogChangeType.VERSION_FIRST_VERSION;

        if (latestVersion != null) {
            let packageFile;
            try {
                packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(latestVersion.package.id, {
                    ...packageIdentifier,
                    versionMajor: latestVersion.majorVersion,
                    versionMinor: latestVersion.minorVersion,
                    versionPatch: latestVersion.patchVersion
                });
            } catch (error) {
                throw new ApolloError("INTERNAL_SERVER_ERROR");
            }

            const latestVersionSemVer = new SemVer(packageFile.version);

            diff = comparePackages(packageFile, newPackageFile);

            const compatibility = diffCompatibility(diff);

            const minNextVersion = nextVersion(latestVersionSemVer, compatibility);

            const minVersionCompare = minNextVersion.compare(proposedNewVersion.version);

            if (compatibility === Compability.Identical) {
                changeType = ActivityLogChangeType.VERSION_TRIVIAL_CHANGE;
                latestVersion.updatedAt = new Date();
                savedVersion = await transaction.getRepository(VersionEntity).save(latestVersion);
            } else {
                if (minVersionCompare === 1) {
                    throw new ApolloError(
                        packageIdentifier.catalogSlug +
                            "/" +
                            packageIdentifier.packageSlug +
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
                } else if (compatibility === Compability.MinorChange) {
                    changeType = ActivityLogChangeType.VERSION_PATCH_CHANGE;
                } else if (compatibility === Compability.CompatibleChange) {
                    changeType = ActivityLogChangeType.VERSION_MINOR_CHANGE;
                } else if (compatibility === Compability.BreakingChange) {
                    changeType = ActivityLogChangeType.VERSION_MAJOR_CHANGE;
                }

                savedVersion = await transaction
                    .getCustomRepository(VersionRepository)
                    .save(context.me.id, packageIdentifier, newPackageFile);
            }
        } else {
            savedVersion = await transaction
                .getCustomRepository(VersionRepository)
                .save(context.me.id, packageIdentifier, newPackageFile);
        }

        const versionIdentifier = {
            ...packageIdentifier,
            versionMajor: proposedNewVersion.major,
            versionMinor: proposedNewVersion.minor,
            versionPatch: proposedNewVersion.patch
        };

        const packageEntity = await transaction
            .getCustomRepository(PackageRepository)
            .findOrFail({ identifier: packageIdentifier });

        await transaction
            .getCustomRepository(PackageRepository)
            .updatePackageReadmeVectors(packageIdentifier, newPackageFile.readmeMarkdown);

        const ALIAS = "findVersion";
        const recalledVersion = await transaction
            .getRepository(VersionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, returnRelations)
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
}
