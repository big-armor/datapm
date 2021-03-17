import "./util/prototypeExtensions";
import { GraphQLScalarType } from "graphql";
import { UserRepository } from "./repository/UserRepository";
import { AuthenticatedContext, AutoCompleteContext, Context } from "./context";
import { PackageRepository } from "./repository/PackageRepository";
import {
    MutationResolvers,
    QueryResolvers,
    UserResolvers,
    CatalogResolvers,
    PackageResolvers,
    VersionResolvers,
    CollectionResolvers,
    CatalogIdentifierInput,
    AutoCompleteResultResolvers,
    RegistryStatus,
    User,
    PackageIssueResolvers,
    PackageIssueCommentResolvers
} from "./generated/graphql";
import * as mixpanel from "./util/mixpanel";
import { getGraphQlRelationName, getRelationNames } from "./util/relationNames";
import { CatalogRepository } from "./repository/CatalogRepository";
import { UserCatalogPermissionRepository } from "./repository/CatalogPermissionRepository";
import { isRequestingUserOrAdmin } from "./util/contextHelpers";
import { UserInputError } from "apollo-server";
import { parsePackageFileJSON, validatePackageFile } from "datapm-lib";
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
    updateCollection,
    collectionPackages,
    usersByCollection,
    myPermissions,
    userCollections,
    collectionIdentifier,
    collectionName,
    collectionCreator,
    collectionDescription,
    collectionEntityToGraphQL,
    collectionIsPublic,
    collectionIsRecommended,
    collectionCreatedAt,
    collectionUpdatedAt,
    getLatestCollections,
    getMyRecentlyViewedPackages,
    collectionSlugAvailable
} from "./resolvers/CollectionResolver";
import {
    createVersion,
    deleteVersion,
    versionAuthor,
    versionCreatedAt,
    versionIdentifier,
    versionPackage,
    versionPackageFile,
    versionUpdatedAt
} from "./resolvers/VersionResolver";
import {
    setUserCollectionPermissions,
    deleteUserCollectionPermissions
} from "./resolvers/UserCollectionPermissionResolver";
import { deleteUserCatalogPermissions, setUserCatalogPermission } from "./resolvers/UserCatalogPermissionResolver";
import { login, logout, verifyEmailAddress } from "./resolvers/AuthResolver";
import {
    createMe,
    deleteMe,
    setMyAvatarImage,
    setMyCoverImage,
    emailAddressAvailable,
    usernameAvailable,
    updateMe,
    updateMyPassword,
    forgotMyPassword,
    recoverMyPassword,
    searchUsers,
    setAsAdmin,
    acceptInvite,
    adminSearchUsers,
    adminDeleteUser,
    adminSetUserStatus
} from "./resolvers/UserResolver";
import { createAPIKey, deleteAPIKey, myAPIKeys } from "./resolvers/ApiKeyResolver";
import {
    createPackage,
    deletePackage,
    findPackage,
    findPackageCreator,
    findPackageIdentifier,
    findPackagesForCollection,
    getLatestPackages,
    searchPackages,
    setPackageCoverImage,
    updatePackage,
    myPackages,
    userPackages,
    usersByPackage,
    packageFetched,
    packageLatestVersion,
    packageCatalog,
    packageVersions,
    myPackagePermissions,
    packageEntityToGraphqlObject,
    catalogPackages,
    packageDescription,
    packageDisplayName,
    packageFetchCount,
    packageCreatedAt,
    packageUpdatedAt,
    packageViewedCount,
    packageIsPublic,
    myRecentlyViewedPackages
} from "./resolvers/PackageResolver";

import { validatePassword } from "./directive/ValidPasswordDirective";
import { validateCatalogSlug } from "./directive/ValidCatalogSlugDirective";
import { validateUsername } from "./directive/ValidUsernameDirective";
import { validateUsernameOrEmail } from "./directive/ValidUsernameOrEmailAddressDirective";
import { validateSlug as validateCollectionSlug } from "./directive/ValidCollectionSlugDirective";
import { validatePackageSlug } from "./directive/ValidPackageSlugDirective";
import { validateEmailAddress } from "./directive/ValidEmailDirective";
import { DateResolver } from "./resolvers/DateResolver";
import { CollectionRepository } from "./repository/CollectionRepository";
import {
    catalogCreator,
    catalogDescription,
    catalogDisplayName,
    catalogEntityToGraphQL,
    catalogIdentifier,
    catalogIsPublic,
    catalogPackagesForUser,
    catalogWebsite,
    createCatalog,
    deleteCatalog,
    deleteCatalogAvatarImage,
    myCatalogPermissions,
    myCatalogs,
    searchCatalogs,
    setCatalogAvatarImage,
    setCatalogCoverImage,
    updateCatalog,
    userCatalogs
} from "./resolvers/CatalogResolver";

import { myActivity, packageActivities } from "./resolvers/ActivityLogResolver";
import { removePackagePermissions, setPackagePermissions } from "./resolvers/UserPackagePermissionResolver";
import {
    createPackageIssue,
    deletePackageIssue,
    deletePackageIssues,
    getIssuesByPackage,
    getPackageIssue,
    getPackageIssueAuthor,
    updatePackageIssue,
    updatePackageIssuesStatuses,
    updatePackageIssueStatus
} from "./resolvers/PackageIssueResolver";
import {
    createPackageIssueComment,
    deletePackageIssueComment,
    getCommentsByByPackageIssue,
    getPackageIssueCommentAuthor,
    updatePackageIssueComment
} from "./resolvers/PackageIssueCommentResolver";

export const resolvers: {
    Query: QueryResolvers;
    Mutation: MutationResolvers;
    Date: DateResolver;
    User: UserResolvers;
    Catalog: CatalogResolvers;
    Collection: CollectionResolvers;
    Package: PackageResolvers;
    PackageIssue: PackageIssueResolvers;
    PackageIssueComment: PackageIssueCommentResolvers;
    Version: VersionResolvers;
    PackageFileJSON: GraphQLScalarType;
    Password: GraphQLScalarType;
    CatalogSlug: GraphQLScalarType;
    PackageSlug: GraphQLScalarType;
    Username: GraphQLScalarType;
    UsernameOrEmailAddress: GraphQLScalarType;
    EmailAddress: GraphQLScalarType;
    CollectionSlug: GraphQLScalarType;
    AutoCompleteResult: AutoCompleteResultResolvers;
} = {
    AutoCompleteResult: {
        packages: async (parent: any, args: any, context: AutoCompleteContext, info: any) => {
            const packageEntities = await context.connection.manager
                .getCustomRepository(PackageRepository)
                .autocomplete({
                    user: context.me,
                    startsWith: context.query,
                    relations: getRelationNames(graphqlFields(info))
                });

            return packageEntities.map((p) => packageEntityToGraphqlObject(context.connection, p));
        },
        users: async (parent: any, args: any, context: AutoCompleteContext, info: any) => {
            return await context.connection.manager.getCustomRepository(UserRepository).autocomplete({
                user: context.me,
                startsWith: context.query,
                relations: getRelationNames(graphqlFields(info))
            });
        },

        catalogs: async (parent: any, args: any, context: AutoCompleteContext, info: any) => {
            const catalogs = await context.connection.manager.getCustomRepository(CatalogRepository).autocomplete({
                user: context.me,
                startsWith: context.query,
                relations: getRelationNames(graphqlFields(info))
            });
            return catalogs.map((c) => catalogEntityToGraphQL(c));
        },

        collections: async (parent: any, args: any, context: AutoCompleteContext, info: any) => {
            const collections = await context.connection.manager
                .getCustomRepository(CollectionRepository)
                .autocomplete({
                    user: context.me,
                    startsWith: context.query,
                    relations: getRelationNames(graphqlFields(info))
                });

            return collections.map((c) => collectionEntityToGraphQL(c));
        }
    },

    PackageFileJSON: new GraphQLScalarType({
        name: "PackageFileJSON",
        serialize: (value: any) => {
            return JSON.stringify(value);
        },
        parseValue: (value: any) => {
            validatePackageFile(value);
            const packageFileObject = parsePackageFileJSON(value);

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
    User: {
        username: async (parent: User, _1: any, context: Context) => {
            if (!parent.username) {
                return parent.emailAddress as string;
            }

            return parent.username;
        },
        firstName: async (parent: User, _1: any, context: Context) => {
            const user = await context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: parent.username });

            if (isRequestingUserOrAdmin(context, user.username) || user.nameIsPublic) {
                return user.firstName || null;
            }

            return null;
        },
        lastName: async (parent: User, _1: any, context: Context) => {
            const user = await context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: parent.username });

            if (isRequestingUserOrAdmin(context, user.username) || user.nameIsPublic) {
                return user.lastName || null;
            }

            return null;
        },
        emailAddress: async (parent: User, _1: any, context: Context) => {
            const user = await context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: parent.username });

            if (isRequestingUserOrAdmin(context, user.username) || user.emailAddressIsPublic) {
                return user.emailAddress;
            }

            return null;
        },
        twitterHandle: async (parent: User, _1: any, context: Context) => {
            const user = await context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: parent.username });

            if (isRequestingUserOrAdmin(context, user.username) || user.twitterHandleIsPublic) {
                return user.twitterHandle || null;
            }

            return null;
        },
        gitHubHandle: async (parent: User, _1: any, context: Context) => {
            const user = await context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: parent.username });

            if (isRequestingUserOrAdmin(context, user.username) || user.gitHubHandleIsPublic) {
                return user.gitHubHandle || null;
            }

            return null;
        },
        website: async (parent: User, _1: any, context: Context) => {
            const user = await context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: parent.username });

            if (isRequestingUserOrAdmin(context, user.username) || user.websiteIsPublic) {
                return user.website || null;
            }

            return null;
        },
        location: async (parent: User, _1: any, context: Context) => {
            const user = await context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: parent.username });

            if (isRequestingUserOrAdmin(context, user.username) || user.locationIsPublic) {
                return user.location || null;
            }

            return null;
        },
        status: async (parent: User, _1: any, context: Context) => {
            const user = await context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: parent.username });

            return user.status;
        }
    },
    Catalog: {
        identifier: catalogIdentifier,
        packages: catalogPackagesForUser,
        myPermissions: myCatalogPermissions,
        creator: catalogCreator,
        description: catalogDescription,
        displayName: catalogDisplayName,
        website: catalogWebsite,
        isPublic: catalogIsPublic
    },
    Collection: {
        name: collectionName,
        description: collectionDescription,
        identifier: collectionIdentifier,
        packages: findPackagesForCollection,
        myPermissions: myPermissions,
        creator: collectionCreator,
        isPublic: collectionIsPublic,
        createdAt: collectionCreatedAt,
        isRecommended: collectionIsRecommended,
        updatedAt: collectionUpdatedAt
    },

    Package: {
        latestVersion: packageLatestVersion,
        catalog: packageCatalog,
        versions: packageVersions,
        identifier: findPackageIdentifier,
        creator: findPackageCreator,
        myPermissions: myPackagePermissions,
        description: packageDescription,
        displayName: packageDisplayName,
        createdAt: packageCreatedAt,
        fetchedCount: packageFetchCount,
        updatedAt: packageUpdatedAt,
        viewedCount: packageViewedCount,
        isPublic: packageIsPublic
    },
    PackageIssue: {
        author: getPackageIssueAuthor
    },
    PackageIssueComment: {
        author: getPackageIssueCommentAuthor
    },
    Version: {
        identifier: versionIdentifier,
        packageFile: versionPackageFile,
        author: versionAuthor,
        createdAt: versionCreatedAt,
        package: versionPackage,
        updatedAt: versionUpdatedAt
    },

    Query: {
        registryStatus: (_0: any, _1: any, context: AuthenticatedContext, info: any) => {
            return RegistryStatus.SERVING_REQUESTS;
        },
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

            return catalogEntityToGraphQL(catalog);
        },

        myCatalogs: myCatalogs,

        myAPIKeys: myAPIKeys,

        package: findPackage,
        packageIssue: getPackageIssue,
        packageIssues: getIssuesByPackage,
        packageIssueComments: getCommentsByByPackageIssue,
        latestPackages: getLatestPackages,
        myPackages: myPackages,
        myRecentlyViewedPackages: myRecentlyViewedPackages,
        collection: findCollectionBySlug,
        collections: findCollectionsForAuthenticatedUser,
        myCollections: myCollections,
        searchCollections: searchCollections,
        latestCollections: getLatestCollections,
        myRecentlyViewedCollections: getMyRecentlyViewedPackages,
        collectionPackages: collectionPackages,
        usersByCollection: usersByCollection,
        usersByPackage: usersByPackage,
        userCatalogs: userCatalogs,
        userCollections: userCollections,
        collectionSlugAvailable: collectionSlugAvailable,
        userPackages: userPackages,
        autoComplete: async (_0: any, { startsWith }, context: AutoCompleteContext, info: any) => {
            context.query = startsWith;
            return {
                catalogs: [],
                users: [],
                collections: [],
                packages: []
            };
        },

        searchCatalogs: searchCatalogs,

        catalogPackages: catalogPackages,

        usersByCatalog: async (
            _0: any,
            { identifier }: { identifier: CatalogIdentifierInput },
            context: AuthenticatedContext,
            info: any
        ) => {
            const relations = getGraphQlRelationName(info);

            const catalogEntity = await context.connection.manager
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlugOrFail(identifier.catalogSlug);

            return await context.connection.manager
                .getCustomRepository(UserCatalogPermissionRepository)
                .usersByCatalog(catalogEntity, relations);
        },

        searchPackages: searchPackages,
        usernameAvailable: usernameAvailable,
        emailAddressAvailable: emailAddressAvailable,
        searchUsers: searchUsers,
        adminSearchUsers: adminSearchUsers,
        myActivity: myActivity,
        packageActivities: packageActivities
    },

    Mutation: {
        // Auth
        login: login,
        logout: logout,
        verifyEmailAddress: verifyEmailAddress,

        // User
        createMe: createMe,
        updateMe: updateMe,
        setAsAdmin: setAsAdmin,
        adminSetUserStatus: adminSetUserStatus,
        updateMyPassword: updateMyPassword,
        forgotMyPassword: forgotMyPassword,
        recoverMyPassword: recoverMyPassword,
        setMyCoverImage: setMyCoverImage,
        setMyAvatarImage: setMyAvatarImage,
        deleteMe: deleteMe,
        acceptInvite: acceptInvite,
        adminDeleteUser: adminDeleteUser,

        // API Keys
        createAPIKey: createAPIKey,
        deleteAPIKey: deleteAPIKey,

        // Catalog
        createCatalog: createCatalog,
        updateCatalog: updateCatalog,
        setCatalogCoverImage: setCatalogCoverImage,
        deleteCatalog: deleteCatalog,
        setCatalogAvatarImage: setCatalogAvatarImage,
        deleteCatalogAvatarImage: deleteCatalogAvatarImage,

        // Catalog Permissions
        setUserCatalogPermission: setUserCatalogPermission,
        deleteUserCatalogPermissions: deleteUserCatalogPermissions,

        // Package
        createPackage: createPackage,
        updatePackage: updatePackage,
        setPackageCoverImage: setPackageCoverImage,
        deletePackage: deletePackage,
        packageFetched: packageFetched,

        // Package issues
        createPackageIssue: createPackageIssue,
        updatePackageIssue: updatePackageIssue,
        updatePackageIssueStatus: updatePackageIssueStatus,
        updatePackageIssuesStatuses: updatePackageIssuesStatuses,
        deletePackageIssues: deletePackageIssues,
        deletePackageIssue: deletePackageIssue,
        createPackageIssueComment: createPackageIssueComment,
        updatePackageIssueComment: updatePackageIssueComment,
        deletePackageIssueComment: deletePackageIssueComment,

        // Package Permissions
        setPackagePermissions: setPackagePermissions,
        removePackagePermissions: removePackagePermissions,

        // Collection
        createCollection: createCollection,
        updateCollection: updateCollection,
        setCollectionCoverImage: setCollectionCoverImage,
        deleteCollection: deleteCollection,
        addPackageToCollection: addPackageToCollection,
        removePackageFromCollection: removePackageFromCollection,

        // Collection Permissions
        setUserCollectionPermissions: setUserCollectionPermissions,
        deleteUserCollectionPermissions: deleteUserCollectionPermissions,

        // Version
        createVersion: createVersion,
        deleteVersion: deleteVersion,

        track: (_, { actions }, context: Context) => mixpanel.track(actions, context.request)
    }
};
