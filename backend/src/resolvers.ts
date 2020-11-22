import "./util/prototypeExtensions";
import { GraphQLScalarType } from "graphql";
import { UserRepository } from "./repository/UserRepository";
import { AuthenticatedContext, Context } from "./context";
import { PackageRepository } from "./repository/PackageRepository";
import {
    MutationResolvers,
    QueryResolvers,
    UserResolvers,
    UserCatalogResolvers,
    CatalogResolvers,
    PackageResolvers,
    VersionResolvers,
    VersionConflict,
    PackageIdentifier,
    CollectionResolvers,
    CatalogIdentifierInput,
    VersionIdentifierInput,
    Base64ImageUpload
} from "./generated/graphql";
import * as mixpanel from "./util/mixpanel";
import { getGraphQlRelationName, getRelationNames } from "./util/relationNames";
import { CatalogRepository } from "./repository/CatalogRepository";
import { Catalog } from "./entity/Catalog";
import { APIKeyRepository } from "./repository/APIKeyRepository";
import { User } from "./entity/User";
import { UserCatalogPermission } from "./entity/UserCatalogPermission";
import { UserCatalogPermissionRepository } from "./repository/CatalogPermissionRepository";
import { isAuthenticatedContext } from "./util/contextHelpers";
import { Version } from "./entity/Version";
import { Package } from "./entity/Package";
import { VersionRepository } from "./repository/VersionRepository";
import { getEnvVariable } from "./util/getEnvVariable";
import fs from "fs";

import AJV from "ajv";
import { SemVer } from "semver";
import { ApolloError, UserInputError, ValidationError } from "apollo-server";

import {
    compatibilityToString,
    comparePackages,
    diffCompatibility,
    nextVersion,
    PackageFile,
    Compability,
    parsePackageFileJSON
} from "datapm-lib";
import graphqlFields from "graphql-fields";
import {
    addPackageToCollection,
    createCollection,
    deleteCollection,
    findCollectionBySlug,
    findCollectionsForAuthenticatedUser,
    myCollections,
    removePackageFromCollection,
    searchCollections,
    setCollectionCoverImage,
    updateCollection
} from "./resolvers/CollectionResolver";
import { login, logout, verifyEmailAddress } from "./resolvers/AuthResolver";
import {
    createMe,
    deleteMe,
    setMyAvatarImage,
    setMyCoverImage,
    emailAddressAvailable,
    usernameAvailable,
    updateMe,
    updateMyPassword
} from "./resolvers/UserResolver";
import { createAPIKey, deleteAPIKey } from "./resolvers/ApiKeyResolver";
import { Collection } from "./entity/Collection";
import {
    catalogPackagesForUser,
    createPackage,
    deletePackage,
    findPackage,
    findPackageCreator,
    findPackageIdentifier,
    findPackagesForCollection,
    getLatestPackages,
    removePackagePermissions,
    searchPackages,
    setPackageCoverImage,
    setPackagePermissions,
    updatePackage,
    myPackages
} from "./resolvers/PackageResolver";
import { ImageStorageService } from "./storage/images/image-storage-service";

import { validatePassword } from "./directive/ValidPasswordDirective";
import { validateSlug as validateCatalogSlug } from "./directive/ValidCatalogSlugDirective";
import { validateUsername } from "./directive/ValidUsernameDirective";
import { validateUsernameOrEmail } from "./directive/ValidUsernameOrEmailAddressDirective";
import { validateSlug as validateCollectionSlug } from "./directive/ValidCollectionSlugDirective";
import { validateSlug as validatePackageSlug } from "./directive/ValidPackageSlugDirective";
import { validateEmailAddress } from "./directive/ValidEmailDirective";
import { FileStorageService, StorageErrors } from "./storage/files/file-storage-service";
import { PackageFileStorageService } from "./storage/packages/package-file-storage-service";
import { DateResolver } from "./resolvers/DateResolver";

export const resolvers: {
    Query: QueryResolvers;
    Mutation: MutationResolvers;
    Date: DateResolver;
    User: UserResolvers;
    UserCatalog: UserCatalogResolvers;
    Catalog: CatalogResolvers;
    Collection: CollectionResolvers;
    Package: PackageResolvers;
    Version: VersionResolvers;
    PackageFileJSON: GraphQLScalarType;
    Password: GraphQLScalarType;
    CatalogSlug: GraphQLScalarType;
    PackageSlug: GraphQLScalarType;
    Username: GraphQLScalarType;
    UsernameOrEmailAddress: GraphQLScalarType;
    EmailAddress: GraphQLScalarType;
    CollectionSlug: GraphQLScalarType;
} = {
    PackageFileJSON: new GraphQLScalarType({
        name: "PackageFileJSON",
        serialize: (value: any) => {
            return JSON.stringify(value);
        },
        parseValue: (value: any) => {
            const packageFileObject = parsePackageFileJSON(value);

            const rawPackageFile = JSON.parse(value);

            const ajv = new AJV();

            const schema = fs.readFileSync("node_modules/datapm-lib/packageFileSchema.json", "utf8");

            const schemaObject = JSON.parse(schema);

            if (!ajv.validateSchema(schemaObject)) {
                throw new ApolloError("ERROR_READING_SCHEMA");
            }

            const response = ajv.validate(schemaObject, rawPackageFile);

            if (!response) {
                throw new ValidationError("INVALID_PACKAGE_FILE_SCHEMA: " + JSON.stringify(ajv.errors!));
            }

            return packageFileObject;
        }
    }),
    Password: new GraphQLScalarType({
        name: "Password",
        serialize: (value: any) => value,
        parseValue: (value: any) => {
            validatePassword(value);
            return value;
        }
    }),
    CatalogSlug: new GraphQLScalarType({
        name: "CatalogSlug",
        serialize: (value: any) => value,
        parseValue: (value: any) => {
            validateCatalogSlug(value);
            return value;
        }
    }),
    PackageSlug: new GraphQLScalarType({
        name: "PackageSlug",
        serialize: (value: any) => value,
        parseValue: (value: any) => {
            validatePackageSlug(value);
            return value;
        }
    }),
    CollectionSlug: new GraphQLScalarType({
        name: "CollectionSlug",
        serialize: (value: any) => value,
        parseValue: (value: any) => {
            validateCollectionSlug(value);
            return value;
        }
    }),
    Username: new GraphQLScalarType({
        name: "Username",
        serialize: (value: any) => value,
        parseValue: (value: any) => {
            validateUsername(value);
            return value;
        }
    }),
    EmailAddress: new GraphQLScalarType({
        name: "EmailAddress",
        serialize: (value: any) => value,
        parseValue: (value: any) => {
            validateEmailAddress(value);
            return value;
        }
    }),
    UsernameOrEmailAddress: new GraphQLScalarType({
        name: "UsernameOrEmailAddress",
        serialize: (value: any) => value,
        parseValue: (value: any) => {
            validateUsernameOrEmail(value);
            return value;
        }
    }),
    Date: new GraphQLScalarType({
        name: "Date",
        serialize: (value: any) => value,
        parseValue: (value: any) => new Date(value)
    }),
    UserCatalog: {
        permissions: (parent: any, _1: any, context: Context) => {
            const userCatalogPermission = parent as UserCatalogPermission;

            if (userCatalogPermission.user.username !== context.me?.username) return null;

            return parent.permissions;
        }
    },
    User: {
        firstName: (parent: any, _1: any, context: Context) => {
            const user = parent as User;

            if (user.nameIsPublic) return user.firstName || null;

            if (isAuthenticatedContext(context) && context.me?.username === user.username)
                return user.firstName || null;

            return null;
        },
        lastName: (parent: any, _1: any, context: AuthenticatedContext) => {
            const user = parent as User;

            if (user.nameIsPublic) return user.lastName || null;

            if (isAuthenticatedContext(context) && context.me?.username === user.username) return user.lastName || null;

            return null;
        },
        emailAddress: (parent: any, _1: any, context: AuthenticatedContext) => {
            const user = parent as User;

            if (user.emailAddressIsPublic) return user.emailAddress;

            if (isAuthenticatedContext(context) && context.me?.username === user.username) return user.emailAddress;

            return null;
        },
        twitterHandle: (parent: any, _1: any, context: AuthenticatedContext) => {
            const user = parent as User;

            if (user.twitterHandleIsPublic) return user.twitterHandle || null;

            if (isAuthenticatedContext(context) && context.me?.username === user.username)
                return user.twitterHandle || null;

            return null;
        },
        gitHubHandle: (parent: any, _1: any, context: AuthenticatedContext) => {
            const user = parent as User;

            if (user.gitHubHandleIsPublic) return user.gitHubHandle || null;

            if (isAuthenticatedContext(context) && context.me?.username === user.username)
                return user.gitHubHandle || null;

            return null;
        },
        website: (parent: any, _1: any, context: AuthenticatedContext) => {
            const user = parent as User;

            if (user.websiteIsPublic) return user.website || null;

            if (isAuthenticatedContext(context) && context.me?.username === user.username) return user.website || null;

            return null;
        },
        location: (parent: any, _1: any, context: AuthenticatedContext) => {
            const user = parent as User;

            if (user.locationIsPublic) return user.location || null;

            if (isAuthenticatedContext(context) && context.me?.username === user.username) return user.location || null;

            return null;
        }
    },
    Catalog: {
        identifier: async (parent: any, _1: any) => {
            const catalog = parent as Catalog;

            return {
                registryURL: getEnvVariable("REGISTRY_URL"),
                catalogSlug: catalog.slug
            };
        },
        packages: catalogPackagesForUser
    },
    Collection: {
        identifier: async (parent: any, _1: any) => {
            const collection = parent as Collection;
            return {
                registryURL: getEnvVariable("REGISTRY_URL"),
                collectionSlug: collection.collectionSlug
            };
        },
        packages: findPackagesForCollection,
        creator: async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
            const collection = parent as Collection;

            return await context.connection
                .getCustomRepository(UserRepository)
                .findOneOrFail({ where: { id: collection.creatorId }, relations: getGraphQlRelationName(info) });
        }
    },

    Package: {
        latestVersion: async (
            parent: any,
            _1: any,
            context: AuthenticatedContext,
            info: any
        ): Promise<Version | null> => {
            const packageEntity = parent as Package;

            const catalog = await context.connection
                .getCustomRepository(CatalogRepository)
                .findOne({ where: { id: packageEntity.catalogId } });

            if (catalog === undefined)
                throw new ApolloError("Could not find catalog " + packageEntity.catalogId, "CATALOG_NOT_FOUND");

            const identifier: PackageIdentifier = {
                registryURL: getEnvVariable("REGISTRY_URL"),
                catalogSlug: catalog.slug,
                packageSlug: packageEntity.slug
            };

            const version = await context.connection.getCustomRepository(VersionRepository).findLatestVersion({
                identifier: identifier,
                relations: getGraphQlRelationName(info)
            });

            if (version == undefined) return null;

            return version;
        },

        identifier: findPackageIdentifier,
        creator: findPackageCreator
    },

    Version: {
        identifier: async (parent: any, _1: any, context: AuthenticatedContext) => {
            const version = parent as Version;

            const packageEntity = await context.connection
                .getRepository(Package)
                .findOneOrFail({ id: version.packageId });

            const catalog = await context.connection
                .getRepository(Catalog)
                .findOneOrFail({ id: packageEntity.catalogId });

            return {
                registryURL: getEnvVariable("REGISTRY_URL"),
                catalogSlug: catalog.slug,
                packageSlug: packageEntity.slug,
                versionMajor: version.majorVersion,
                versionMinor: version.minorVersion,
                versionPatch: version.patchVersion
            };
        },
        packageFile: async (parent: any, _1: any, context: AuthenticatedContext) => {
            const version = parent as Version;

            const packageEntity = await context.connection
                .getRepository(Package)
                .findOneOrFail({ id: version.packageId });

            const catalog = await context.connection
                .getRepository(Catalog)
                .findOneOrFail({ id: packageEntity.catalogId });

            try {
                return await PackageFileStorageService.INSTANCE.readPackageFile({
                    catalogSlug: catalog.slug,
                    packageSlug: packageEntity.slug,
                    versionMajor: version.majorVersion,
                    versionMinor: version.minorVersion,
                    versionPatch: version.patchVersion
                });
            } catch (error) {
                if (error.message == StorageErrors.FILE_DOES_NOT_EXIST) {
                    throw new Error("PACKAGE_FILE_NOT_FOUND");
                }

                throw error;
            }
        }
    },

    Query: {
        me: async (_0: any, _1: any, context: AuthenticatedContext, info: any) => {
            const user = await context.connection.getCustomRepository(UserRepository).findUserByUserName({
                username: context.me.username,
                relations: getGraphQlRelationName(info)
            });

            return user;
        },

        user: async (_0: any, args: { username: string }, context: AuthenticatedContext, info: any) => {
            const user = await context.connection.getCustomRepository(UserRepository).findUser({
                username: args.username,
                relations: getGraphQlRelationName(info)
            });

            return user;
        },

        catalog: async (_0: any, { identifier }, context: AuthenticatedContext, info: any) => {
            const graphQLRelationName = getGraphQlRelationName(info);

            const catalog = await context.connection.getCustomRepository(CatalogRepository).findCatalogBySlug({
                slug: identifier.catalogSlug,
                relations: graphQLRelationName
            });

            if (catalog == null) {
                throw new UserInputError("CATALOG_NOT_FOUND");
            }

            return catalog;
        },

        myCatalogs: async (_0: any, {}, context: AuthenticatedContext) => {
            const permissions = await context.connection.manager
                .getCustomRepository(UserCatalogPermissionRepository)
                .findByUser({ username: context.me?.username, relations: ["catalog"] });

            return permissions.filter((p) => p.catalog != null).map((p) => p.catalog);
        },

        myAPIKeys: async (_0: any, {}, context: AuthenticatedContext) => {
            const apiKeys = await context.connection.manager
                .getCustomRepository(APIKeyRepository)
                .findByUser(context.me?.id);

            return apiKeys;
        },

        package: findPackage,
        latestPackages: getLatestPackages,
        myPackages: myPackages,
        collection: findCollectionBySlug,
        collections: findCollectionsForAuthenticatedUser,
        myCollections: myCollections,
        searchCollections: searchCollections,

        autoComplete: async (_0: any, { startsWith }, context: AuthenticatedContext, info: any) => {
            const catalogs = context.connection.manager.getCustomRepository(CatalogRepository).autocomplete({
                user: context.me,
                startsWith,
                relations: getRelationNames(graphqlFields(info).catalogs)
            });

            const packages = context.connection.manager.getCustomRepository(PackageRepository).autocomplete({
                user: context.me,
                startsWith,
                relations: getRelationNames(graphqlFields(info).packages)
            });

            return {
                catalogs: await catalogs,
                packages: await packages
            };
        },

        searchCatalogs: async (_0: any, { query, limit, offSet }, context: AuthenticatedContext, info: any) => {
            const [searchResponse, count] = await context.connection.manager
                .getCustomRepository(CatalogRepository)
                .search({
                    user: context.me,
                    query,
                    limit,
                    offSet,
                    relations: getRelationNames(graphqlFields(info).catalogs)
                });

            return {
                hasMore: count - (offSet + limit) > 0,
                catalogs: searchResponse,
                count
            };
        },

        searchPackages: searchPackages,

        usernameAvailable: usernameAvailable,

        emailAddressAvailable: emailAddressAvailable
    },

    Mutation: {
        // Auth
        login: login,
        logout: logout,
        verifyEmailAddress: verifyEmailAddress,
        // User
        createMe: createMe,
        updateMe: updateMe,
        updateMyPassword: updateMyPassword,
        setMyCoverImage: setMyCoverImage,
        setMyAvatarImage: setMyAvatarImage,
        deleteMe: deleteMe,

        // API Keys
        createAPIKey: createAPIKey,
        deleteAPIKey: deleteAPIKey,

        removeUserFromCatalog: async (_0: any, { username, identifier }, context: AuthenticatedContext, info: any) => {
            const catalog = await context.connection.manager
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlug({ slug: identifier.catalogSlug });

            if (catalog === undefined) {
                throw new UserInputError("CATALOG_NOT_FOUND");
            }

            return context.connection.manager.getCustomRepository(UserRepository).removeUserFromCatalog({
                username: username,
                catalog: catalog,
                relations: getGraphQlRelationName(info)
            });
        },

        createCatalog: async (_0: any, { value }, context: AuthenticatedContext, info: any) => {
            return context.connection.manager.getCustomRepository(CatalogRepository).createCatalog({
                username: context.me?.username,
                value,
                relations: getGraphQlRelationName(info)
            });
        },

        updateCatalog: async (_0: any, { identifier, value }, context: AuthenticatedContext, info: any) => {
            return context.connection.manager.getCustomRepository(CatalogRepository).updateCatalog({
                identifier,
                value,
                relations: getGraphQlRelationName(info)
            });
        },

        setCatalogCoverImage: async (
            _0: any,
            { identifier, image }: { identifier: CatalogIdentifierInput; image: Base64ImageUpload },
            context: AuthenticatedContext,
            info: any
        ) => {
            await ImageStorageService.INSTANCE.saveCatalogCoverImage(identifier, image.base64);
        },

        deleteCatalog: async (
            _0: any,
            { identifier }: { identifier: CatalogIdentifierInput },
            context: AuthenticatedContext,
            info: any
        ) => {
            return context.connection.manager.getCustomRepository(CatalogRepository).deleteCatalog({
                slug: identifier.catalogSlug
            });
        },

        createPackage: createPackage,
        updatePackage: updatePackage,
        setPackageCoverImage: setPackageCoverImage,
        deletePackage: deletePackage,

        setPackagePermissions: setPackagePermissions,
        removePackagePermissions: removePackagePermissions,

        createCollection: createCollection,
        updateCollection: updateCollection,
        setCollectionCoverImage: setCollectionCoverImage,
        deleteCollection: deleteCollection,
        addPackageToCollection: addPackageToCollection,
        removePackageFromCollection: removePackageFromCollection,

        createVersion: async (_0: any, { identifier, value }, context: AuthenticatedContext, info: any) => {
            const fileStorageService = FileStorageService.INSTANCE;

            return await context.connection.manager.nestedTransaction(async (transaction) => {
                const proposedNewVersion = new SemVer(value.packageFile.version);

                const newPackageFile = value.packageFile as PackageFile;

                // get the latest version
                const latestVersion = await transaction
                    .getCustomRepository(VersionRepository)
                    .findLatestVersion({ identifier });

                if (latestVersion != null) {
                    const packageFile = await PackageFileStorageService.INSTANCE.readPackageFile({
                        ...identifier,
                        versionMajor: latestVersion.majorVersion,
                        versionMinor: latestVersion.minorVersion,
                        versionPatch: latestVersion.patchVersion
                    });

                    const latestVersionSemVer = new SemVer(packageFile!.version);

                    const diff = comparePackages(packageFile, newPackageFile);

                    const compatibility = diffCompatibility(diff);

                    const minNextVersion = nextVersion(latestVersionSemVer, compatibility);

                    const minVersionCompare = minNextVersion.compare(proposedNewVersion.version);

                    if (compatibility == Compability.Identical) {
                        throw new ApolloError(
                            identifier.catalogSlug +
                                "/" +
                                identifier.packageSlug +
                                "/" +
                                latestVersionSemVer.version +
                                " already exists, and the submission is identical to it",
                            VersionConflict.VERSION_EXISTS,
                            { existingVersion: latestVersionSemVer.version }
                        );
                    }
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
                    }
                }

                const savedVersion = await transaction
                    .getCustomRepository(VersionRepository)
                    .save(context.me.id, identifier, value);

                const versionIdentifier = {
                    ...identifier,
                    versionMajor: proposedNewVersion.major,
                    versionMinor: proposedNewVersion.minor,
                    versionPatch: proposedNewVersion.patch
                };

                await transaction
                    .getCustomRepository(PackageRepository)
                    .updatePackageReadmeVectors(identifier, newPackageFile.readmeMarkdown);

                if (value.packageFile)
                    await PackageFileStorageService.INSTANCE.writePackageFile(versionIdentifier, value.packageFile);

                const ALIAS = "findVersion";
                const recalledVersion = await transaction
                    .getRepository(Version)
                    .createQueryBuilder(ALIAS)
                    .addRelations(ALIAS, getGraphQlRelationName(info))
                    .where({ id: savedVersion.id })
                    .getOne();

                if (recalledVersion === undefined)
                    throw new Error("Could not find the version after saving. This should never happen!");

                return recalledVersion;
            });
        },

        deleteVersion: async (
            _0: any,
            { identifier }: { identifier: VersionIdentifierInput },
            context: AuthenticatedContext
        ) => {
            await context.connection.manager.nestedTransaction(async (transaction) => {
                const version = await transaction.getCustomRepository(VersionRepository).findOneOrFail({ identifier });

                transaction.delete(Version, { id: version.id });
            });
        },

        track: (_, { actions }, context: Context) => mixpanel.track(actions, context.request)
    }
};
