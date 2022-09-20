import { comparePackages, Difference } from "datapm-lib";
import { GraphQLResolveInfo } from "graphql";
import { SemVer } from "semver";
import { Context } from "../context";
import { PackageEntity } from "../entity/PackageEntity";
import { VersionDifferenceEntity } from "../entity/VersionDifferenceEntity";
import { VersionEntity } from "../entity/VersionEntity";
import { PackageDifferenceType, PackageIdentifierInput, VersionIdentifierInput } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionComparisonRepository, saveVersionComparison } from "../repository/VersionComparisonRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";

export const packageVersionsDiffs = async (
    _0: unknown,
    {
        packageIdentifier,
        offset,
        limit
    }: {
        packageIdentifier: PackageIdentifierInput;
        offset: number;
        limit: number;
    },
    context: Context,
    info: GraphQLResolveInfo
): Promise<VersionDifference[]> => {
    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findOrFail({ identifier: packageIdentifier });
    const versions = await context.connection
        .getCustomRepository(VersionRepository)
        .findVersionsWithLimitAndOffset(packageEntity.id, offset, limit + 1);

    const comparingPairs: { newVersionEntity: VersionEntity; oldVersionEntity: VersionEntity }[] = [];
    for (let i = 0; i < versions.length; i++) {
        if (i === versions.length - 1) {
            break;
        }

        comparingPairs.push({ newVersionEntity: versions[i], oldVersionEntity: versions[i + 1] });
    }

    return comparingPairs.asyncMap(({ newVersionEntity, oldVersionEntity }) =>
        packageVersionsDiffFromVersionEntities(
            _0,
            { packageIdentifier, packageEntity, newVersionEntity, oldVersionEntity },
            context
        )
    );
};

export const packageVersionsDiff = async (
    _0: unknown,
    {
        newVersion,
        oldVersion
    }: {
        newVersion: VersionIdentifierInput;
        oldVersion: VersionIdentifierInput;
    },
    context: Context,
    info: GraphQLResolveInfo
): Promise<VersionDifference> => {
    if (newVersion.catalogSlug !== oldVersion.catalogSlug || newVersion.packageSlug !== oldVersion.packageSlug) {
        throw new Error("DIFFERENT_VERSIONS_PACKAGES");
    }

    const versions = getVersionsInRightOrder(newVersion, oldVersion);
    if (!versions) {
        return { newVersion, oldVersion, differences: [] };
    }

    const { actualNewVersion, actualOldVersion } = versions;

    const packageIdentifier = {
        catalogSlug: actualNewVersion.catalogSlug,
        packageSlug: actualNewVersion.packageSlug
    };
    const packageEntity = await context.connection.manager.getCustomRepository(PackageRepository).findPackageOrFail({
        identifier: packageIdentifier
    });

    const versionRepository = context.connection.getCustomRepository(VersionRepository);
    const newVersionEntity = await versionRepository.findVersion(
        packageEntity.id,
        actualNewVersion.versionMajor,
        actualNewVersion.versionMinor,
        actualNewVersion.versionPatch
    );
    const oldVersionEntity = await versionRepository.findVersion(
        packageEntity.id,
        actualOldVersion.versionMajor,
        actualOldVersion.versionMinor,
        actualOldVersion.versionPatch
    );

    if (!newVersionEntity || !oldVersionEntity) {
        throw new Error("INVALID_VERSIONS_TO_COMPARE");
    }

    return packageVersionsDiffFromVersionEntities(
        _0,
        { packageIdentifier, packageEntity, newVersionEntity, oldVersionEntity },
        context
    );
};

export const packageVersionsDiffFromVersionEntities = async (
    _0: unknown,
    {
        packageIdentifier,
        packageEntity,
        newVersionEntity,
        oldVersionEntity
    }: {
        packageIdentifier: PackageIdentifierInput;
        packageEntity: PackageEntity;
        newVersionEntity: VersionEntity;
        oldVersionEntity: VersionEntity;
    },
    context: Context
): Promise<VersionDifference> => {
    const comparisonRepository = context.connection.getCustomRepository(VersionComparisonRepository);
    const relations = ["newVersion", "oldVersion", "differences"];
    const comparisonEntity = await comparisonRepository.getComparisonByVersionIds(
        newVersionEntity.id,
        oldVersionEntity.id,
        relations
    );

    if (comparisonEntity) {
        return {
            newVersion: versionEntityToVersionValuesObject(comparisonEntity.newVersion),
            oldVersion: versionEntityToVersionValuesObject(comparisonEntity.oldVersion),
            differences: versionDifferenceEntityToVersionValuesObject(comparisonEntity.differences)
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

function getVersionsInRightOrder(
    newVersion: VersionIdentifierInput,
    oldVersion: VersionIdentifierInput
): {
    actualNewVersion: VersionIdentifierInput;
    actualOldVersion: VersionIdentifierInput;
} | null {
    const serializedNewSemVer = serializeSemanticVersion(newVersion);
    const newSemVer = new SemVer(serializedNewSemVer);

    const serializedOldSemVer = serializeSemanticVersion(oldVersion);
    const oldSemVer = new SemVer(serializedOldSemVer);

    const comparison = newSemVer.compare(oldSemVer);
    if (comparison === 0) {
        return null;
    }

    let actualNewVersion;
    let actualOldVersion;

    if (comparison === 1) {
        actualNewVersion = newVersion;
        actualOldVersion = oldVersion;
    } else {
        actualNewVersion = oldVersion;
        actualOldVersion = newVersion;
    }

    return { actualNewVersion, actualOldVersion };
}

function serializeSemanticVersion(version: VersionIdentifierInput): string {
    return `${version.versionMajor}.${version.versionMinor}.${version.versionPatch}`;
}

type Version = {
    versionMajor: number;
    versionMinor: number;
    versionPatch: number;
};

type VersionValues = {
    type: PackageDifferenceType;
    pointer: string;
};

type VersionDifference = {
    newVersion: Version;
    oldVersion: Version;
    differences: VersionValues[];
};

export async function createVersionComparison(
    newVersionId: number,
    oldVersionId: number,
    differences: Difference[],
    context: Context
): Promise<VersionDifference> {
    const result = await context.connection.manager.nestedTransaction(async (transaction) => {
        return saveVersionComparison(transaction, newVersionId, oldVersionId, differences);
    });

    const createdComparisonEntity = await getComparisonByVersionIdsOrThrowError(newVersionId, oldVersionId, context);
    return {
        newVersion: versionEntityToVersionValuesObject(createdComparisonEntity.newVersion),
        oldVersion: versionEntityToVersionValuesObject(createdComparisonEntity.oldVersion),
        differences: versionDifferenceEntityToVersionValuesObject(result.differencesEntitities)
    };
}

const getComparisonByVersionIdsOrThrowError = async (newVersionId: number, oldVersionId: number, context: Context) => {
    const relations = ["newVersion", "oldVersion"];
    const repository = context.connection.getCustomRepository(VersionComparisonRepository);
    const entity = await repository.getComparisonByVersionIds(newVersionId, oldVersionId, relations);
    if (!entity) {
        throw new Error("COMPARISON_NOT_FOUND");
    }

    return entity;
};

const versionDifferenceEntityToVersionValuesObject = (entities: VersionDifferenceEntity[]) => {
    return entities.map((entity) => ({
        type: entity.type as PackageDifferenceType,
        pointer: entity.pointer
    }));
};

const versionEntityToVersionValuesObject = (entity: VersionEntity) => {
    return {
        versionMajor: entity.majorVersion,
        versionMinor: entity.minorVersion,
        versionPatch: entity.patchVersion
    };
};
