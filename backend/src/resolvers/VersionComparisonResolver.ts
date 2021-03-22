import { comparePackages, Difference } from "datapm-lib";
import { Context } from "../context";
import { VersionEntity } from "../entity/VersionEntity";
import { VersionIdentifierInput } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionComparisonRepository } from "../repository/VersionComparisonRepository";
import { VersionDifferenceRepository } from "../repository/VersionDifferenceRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";

export async function createVersionComparison(
    newVersionId: number,
    oldVersionId: number,
    differences: Difference[],
    context: Context
) {
    return context.connection.manager.nestedTransaction(async (transaction) => {
        const comparisonRepository = transaction.getCustomRepository(VersionComparisonRepository);

        // TODO: ERMAL Force versions fetching here
        const comparisonEntity = await comparisonRepository.createNewComparison(newVersionId, oldVersionId);

        console.log("Differences", differences);
        const differencesRepository = transaction.getCustomRepository(VersionDifferenceRepository);
        const differencesEntities = await differencesRepository.batchCreateNewDifferences(
            comparisonEntity.id,
            differences
        );

        const newVersion = comparisonEntity.newVersion;
        const oldVersion = comparisonEntity.oldVersion;
        console.log("newVersion", newVersion);
        console.log("oldVersion", oldVersion);
        return {
            newVersion: versionEntityToVersionValuesObject(newVersion),
            oldVersion: versionEntityToVersionValuesObject(oldVersion),
            differences: differencesEntities
        };
    });
}

export const packageVersionsDiff = async (
    _0: any,
    {
        newVersion,
        oldVersion
    }: {
        newVersion: VersionIdentifierInput;
        oldVersion: VersionIdentifierInput;
    },
    context: Context,
    info: any
) => {
    if (newVersion.catalogSlug != oldVersion.catalogSlug || newVersion.packageSlug != oldVersion.packageSlug) {
        throw new Error("DIFFERENT_VERSIONS_PACKAGES");
    }

    const packageIdentifier = {
        catalogSlug: newVersion.catalogSlug,
        packageSlug: newVersion.packageSlug
    };
    const packageEntity = await context.connection.manager.getCustomRepository(PackageRepository).findPackageOrFail({
        identifier: packageIdentifier
    });

    const versionRepository = context.connection.getCustomRepository(VersionRepository);
    const newVersionEntity = await versionRepository.findVersion(
        packageEntity.id,
        newVersion.versionMajor,
        newVersion.versionMinor,
        newVersion.versionPatch
    );
    const oldVersionEntity = await versionRepository.findVersion(
        packageEntity.id,
        oldVersion.versionMajor,
        oldVersion.versionMinor,
        oldVersion.versionPatch
    );

    if (!newVersionEntity || !oldVersionEntity) {
        throw new Error("INVALID_VERSIONS_TO_COMPARE");
    }

    const comparisonRepository = context.connection.getCustomRepository(VersionComparisonRepository);
    const relations = ["newVersion", "oldVersion"];
    const comparisonEntity = await comparisonRepository.getComparisonByVersionIds(
        newVersionEntity.id,
        oldVersionEntity.id,
        relations
    );
    if (comparisonEntity) {
        return {
            newVersion: versionEntityToVersionValuesObject(comparisonEntity.newVersion),
            oldVersion: versionEntityToVersionValuesObject(comparisonEntity.newVersion),
            differences: comparisonEntity.differences
        };
    }

    try {
        const newPackageVersionFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            ...packageIdentifier,
            versionMajor: newVersionEntity.majorVersion,
            versionMinor: newVersionEntity.minorVersion,
            versionPatch: newVersionEntity.patchVersion
        });
        const oldPackageVersionFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
            ...packageIdentifier,
            versionMajor: oldVersionEntity.majorVersion,
            versionMinor: oldVersionEntity.minorVersion,
            versionPatch: oldVersionEntity.patchVersion
        });
        const differences = comparePackages(newPackageVersionFile, oldPackageVersionFile);
        return createVersionComparison(newVersionEntity.id, oldVersionEntity.id, differences, context);
    } catch (error) {
        throw new Error("INTERNAL_SERVER_ERROR");
    }
};

const versionEntityToVersionValuesObject = (entity: VersionEntity) => {
    return {
        versionMajor: entity.majorVersion,
        versionMinor: entity.minorVersion,
        versionPatch: entity.patchVersion
    };
};
