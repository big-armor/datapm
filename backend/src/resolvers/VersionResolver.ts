import {
    PackageFile,
    PublishMethod,
    Source
} from "datapm-lib";
import { VersionRepository } from "./../repository/VersionRepository";
import { PackageFileStorageService } from "./../storage/packages/package-file-storage-service";
import { AuthenticatedContext, Context } from "./../context";
import {
    ActivityLogEventType,
    CreateVersionInput,
    Package,
    PackageIdentifierInput,
    Permission,
    User,
    Version,
    VersionIdentifier,
    VersionIdentifierInput,
    UpdateMethod
} from "../generated/graphql";
import { getGraphQlRelationName } from "./../util/relationNames";
import { VersionEntity } from "../entity/VersionEntity";
import { createActivityLog } from "./../repository/ActivityLogRepository";
import { getCatalogFromCacheOrDbByIdOrFail } from "./CatalogResolver";
import { StorageErrors } from "../storage/files/file-storage-service";
import { hasPackagePermissions } from "./UserPackagePermissionResolver";
import { getPackageFromCacheOrDbById, packageEntityToGraphqlObject } from "./PackageResolver";
import { Connection, EntityManager } from "typeorm";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { Maybe } from "graphql/jsutils/Maybe";
import { GraphQLResolveInfo } from "graphql";
import { createOrUpdateVersion } from "../business/CreateVersion";

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
    info: GraphQLResolveInfo
) => {
    const relations = getGraphQlRelationName(info);
    return createOrUpdateVersion(context, identifier, value, relations);
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

/** Return the unmodified original package file, only when the requester has EDIT permission */
export const canonicalPackageFile = async (parent: any, _1: any, context: AuthenticatedContext): Promise<Maybe<PackageFile>> => {

    if(context.me == null) {
        return null;
    }

    const version = await getPackageVersionFromCacheOrDbByIdentifier(context, parent.identifier);
    const packageEntity = await getPackageFromCacheOrDbById(context, context.connection, version.packageId);

    const permissions = await context.connection.getCustomRepository(PackagePermissionRepository).findPackagePermissions({
        userId: context.me.id,
        packageId: packageEntity.id,
    });

    if(permissions == null || permissions.permissions.includes(Permission.EDIT) === false) {
        return null;
    }

    let packageFile:PackageFile;
    try {
        packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
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

    return packageFile;
}

export const modifiedPackageFile = async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
    const version = await getPackageVersionFromCacheOrDbByIdentifier(context, parent.identifier);
    const packageEntity = await getPackageFromCacheOrDbById(context, context.connection, version.packageId);

    let packageFile:PackageFile;
    try {
        packageFile = await PackageFileStorageService.INSTANCE.readPackageFile(packageEntity.id, {
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
    // Find this registry in the package file
    const registry = (packageFile.registries || []).find(reg => reg.url === process.env.REGISTRY_URL);


    const publishMethod = registry?.publishMethod || PublishMethod.SCHEMA_ONLY;

    // If the publish method was to store data or proxy, 
    // then we need to replace the sources with the registry based source
    if(publishMethod === PublishMethod.SCHEMA_AND_DATA) {
        // This means that this registry contains the data, and therefore we need to replace the source with this registry
        const registrySources: Source[] = packageFile.schemas.map<Source>(schema => {


            if(schema.title == null)
                throw new Error("SCHEMA_HAS_NO_TITLE");

            return {
                connectionConfiguration: {
                    url: process.env.REGISTRY_URL as string
                },
                slug: schema.title,
                type: "datapm",
                configuration: {
                    catalogSlug: packageEntity.catalog.slug,
                    packageSlug: packageEntity.slug,
                    version: version.majorVersion
                },
                streamSets: [
                    {
                        schemaTitles: [schema.title],
                        slug: schema.title,
                        configuration: {
                            schemaSlug: schema.title
                        },
                        streamStats: {
                            inspectedCount: 0,
                        },
                        updateMethods: 
                            Array.from(packageFile.sources
                                .flatMap(s => s.streamSets)
                                .filter(s => s.schemaTitles.includes(schema.title!))
                                .reduce((acc, s) => {
                                    for(const u of s.updateMethods) {
                                        acc.add(u)
                                    }
                                    return acc;
                                }, new Set<UpdateMethod>())
                            )
                                
                        // TODO implement lastUpdateHash and stream stats by 
                        // keeping an index of the records at data storage time in index.ts
                    }
                ]
            }
            
        });

        packageFile.sources = registrySources;

        packageFile.canonical = false;
        packageFile.modifiedProperties = ["sources"];

    } else if(publishMethod === PublishMethod.SCHEMA_PROXY_DATA) {
        const registrySources: Source[] = packageFile.sources.map<Source>(source => {
            return {
                connectionConfiguration: {
                    url: process.env.REGISTRY_URL as string
                },
                slug: source.slug,
                type: "datapmRegistryProxy",
                configuration: {
                    catalogSlug: packageEntity.catalog.slug,
                    packageSlug: packageEntity.slug,
                    sourceSlug: source.slug
                },
                streamSets: source.streamSets.map(streamSet => {
                    return {
                        ...streamSet,
                        configuration: {
                            streamSetSlug: streamSet.slug
                        }
                    }
                })
            }
        });

        packageFile.sources = registrySources;
        packageFile.canonical = false;
        packageFile.modifiedProperties = ["sources"];
    }

    return packageFile;


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

export const versionUpdateMethods = async (
    parent: Version,
    _1: any,
    context: AuthenticatedContext,
    info: any
): Promise<UpdateMethod[] | null> => {

    const version = await getPackageVersionFromCacheOrDbByIdentifier(context, parent.identifier);
    if (!(await hasPackagePermissions(context, version.packageId, Permission.VIEW))) {
        return null;
    }

    return version.updateMethods;

}

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
