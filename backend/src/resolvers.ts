import "./util/prototypeExtensions";
import { GraphQLResolveInfo, GraphQLScalarType } from "graphql";
import { getUserByUserName, UserRepository } from "./repository/UserRepository";
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
    PackageIssueCommentResolvers,
    FollowResolvers,
    ActivityLogResolvers,
    BuilderIOSettings,
    BuilderIOPage,
    GroupResolvers,
    UserStatus
} from "./generated/graphql";
import { getGraphQlRelationName, getRelationNames } from "./util/relationNames";
import { CatalogRepository } from "./repository/CatalogRepository";
import { UserCatalogPermissionRepository } from "./repository/CatalogPermissionRepository";
import { isAuthenticatedAsAdmin, isRequestingUserOrAdmin } from "./util/contextHelpers";
import { DATAPM_VERSION, parsePackageFileJSON } from "datapm-lib";
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
    collectionSlugAvailable,
    getPackageCollections
} from "./resolvers/CollectionResolver";
import {
    createVersion,
    deleteVersion,
    versionAuthor,
    versionCreatedAt,
    versionIdentifier,
    versionPackage,
    modifiedPackageFile,
    versionUpdatedAt,
    canonicalPackageFile,
    versionUpdateMethods
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
    adminSetUserStatus,
    getUserFromCacheOrDbByUsernameOrFail
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
    myRecentlyViewedPackages,
    movePackage,
    packageUpdateMethods
} from "./resolvers/PackageResolver";

import { createCredential, deleteCredential } from "./resolvers/CredentialResolver";
import { createRepository, listRepositories, deleteRepository } from "./resolvers/RepositoryResolver";

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
    catalogIsUnclaimed,
    catalogPackagesForUser,
    catalogWebsite,
    createCatalog,
    deleteCatalog,
    deleteCatalogAvatarImage,
    getCatalogByIdentifier,
    getCatalogByIdentifierOrFail,
    myCatalogPermissions,
    myCatalogs,
    searchCatalogs,
    setCatalogAvatarImage,
    setCatalogCoverImage,
    updateCatalog,
    userCatalogs
} from "./resolvers/CatalogResolver";

import {
    logAuthor,
    logCatalog,
    logCollection,
    logGroup,
    logId,
    logPackage,
    logPackageIssue,
    logPropertiesEdited,
    logUser,
    myActivity,
    myFollowingActivity,
    packageActivities
} from "./resolvers/ActivityLogResolver";
import { removePackagePermissions, setPackagePermissions } from "./resolvers/UserPackagePermissionResolver";
import {
    createPackageIssue,
    deletePackageIssue,
    deletePackageIssues,
    getIssuesByPackage,
    getPackageIssue,
    getPackageIssueAuthor,
    getPackageIssuePackageIdentifier,
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
import { packageVersionsDiff, packageVersionsDiffs } from "./resolvers/VersionComparisonResolver";
import {
    catalogFollowers,
    catalogFollowersCount,
    collectionFollowers,
    collectionFollowersCount,
    deleteAllMyFollows,
    deleteFollow,
    followPackage,
    getAllMyFollows,
    getFollow,
    packageFollowers,
    packageFollowersCount,
    packageIssueFollowers,
    packageIssueFollowersCount,
    saveFollow,
    userFollowers,
    userFollowersCount
} from "./resolvers/FollowResolver";

import {
    createGroup,
    updateGroup,
    deleteGroup,
    addOrUpdateUserToGroup,
    removeUserFromGroup,
    myGroupPermissions,
    myGroups,
    group,
    setGroupAsAdmin,
    adminSearchGroups,
    adminDeleteGroup,
    groupUsers
} from "./resolvers/GroupResolver";
import {
    addOrUpdateGroupToPackage,
    removeGroupFromPackage,
    groupsByPackage,
    packagePermissionsByGroupForUser
} from "./resolvers/GroupPackagePermissionResolver";

import {
    getPlatformSettingsByKey,
    getDeserializedPublicPlatformSettingsByKey,
    getPublicPlatformSettingsByKeyOrFail,
    savePlatformSettings
} from "./resolvers/PlatformSettingsResolver";

import { runJob } from "./resolvers/JobResolver";
import {
    addOrUpdateGroupToCatalog,
    removeGroupFromCatalog,
    groupsByCatalog,
    catalogPermissionsByGroupForUser
} from "./resolvers/GroupCatalogPermissionResolver";
import {
    addOrUpdateGroupToCollection,
    removeGroupFromCollection,
    groupsByCollection,
    collectionPermissionsByGroupForUser
} from "./resolvers/GroupCollectionPermissionResolver";
import { me } from "./resolvers/MeResolver";
import { Catalog } from "datapm-client-lib";
import { getEnvVariable } from "./util/getEnvVariable";

import { listConnectors } from "./resolvers/ConnectorsResolver";

export const getPageContentByRoute = async (
    _0: unknown,
    { route }: { route: string },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    user?: User;
    catalog?: Catalog;
    builderIOPage?: BuilderIOPage;
}> => {
    const user = await getUserByUserName({ username: route, manager: context.connection.manager });
    if (user) {
        return { user };
    }

    const graphqlFields2 = graphqlFields(info);
    const catalogRelations = getRelationNames(graphqlFields2.catalog);
    const catalog = await getCatalogByIdentifier(_0, { identifier: { catalogSlug: route } }, context, catalogRelations);
    if (catalog) {
        return { catalog };
    }

    const builderIOSettings = (await getDeserializedPublicPlatformSettingsByKey(
        _0,
        { key: "builder-io-settings" },
        context
    )) as BuilderIOSettings;

    let template = builderIOSettings.templates?.find((t) => t.key === route);

    if (!template) {
        template = builderIOSettings.templates?.find((t) => t.key === "404");
    }

    const builderIOPage: BuilderIOPage = {
        apiKey: builderIOSettings.apiKey,
        template
    };

    return { builderIOPage };
};

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
    Follow: FollowResolvers;
    ActivityLog: ActivityLogResolvers;
    Group: GroupResolvers;
} = {
    AutoCompleteResult: {
        packages: async (parent, args, context: AutoCompleteContext, info: GraphQLResolveInfo) => {
            const packageEntities = await context.connection.manager
                .getCustomRepository(PackageRepository)
                .autocomplete({
                    user: context.me,
                    startsWith: context.query,
                    relations: getRelationNames(graphqlFields(info))
                });

            return packageEntities.map((p) => packageEntityToGraphqlObject(context, context.connection, p));
        },
        users: async (parent, args, context: AutoCompleteContext, info: GraphQLResolveInfo) => {
            return await context.connection.manager.getCustomRepository(UserRepository).autocomplete({
                user: context.me,
                startsWith: context.query,
                relations: getRelationNames(graphqlFields(info))
            });
        },

        catalogs: async (parent, args, context: AutoCompleteContext, info: GraphQLResolveInfo) => {
            const catalogs = await context.connection.manager.getCustomRepository(CatalogRepository).autocomplete({
                user: context.me,
                startsWith: context.query,
                relations: getRelationNames(graphqlFields(info))
            });
            return catalogs.map((c) => catalogEntityToGraphQL(c));
        },

        collections: async (parent, args, context: AutoCompleteContext, info: GraphQLResolveInfo) => {
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
        serialize: (value) => {
            return JSON.stringify(value);
        },
        parseValue: (value) => {
            const packageFileObject = parsePackageFileJSON(value);

            return packageFileObject;
        }
    }),
    Password: new GraphQLScalarType({
        name: "Password",
        serialize: (value) => value,
        parseValue: (value) => {
            validatePassword(value);
            return value;
        }
    }),
    CatalogSlug: new GraphQLScalarType({
        name: "CatalogSlug",
        serialize: (value) => value,
        parseValue: (value) => {
            validateCatalogSlug(value);
            return value;
        }
    }),
    PackageSlug: new GraphQLScalarType({
        name: "PackageSlug",
        serialize: (value) => value,
        parseValue: (value) => {
            validatePackageSlug(value);
            return value;
        }
    }),
    CollectionSlug: new GraphQLScalarType({
        name: "CollectionSlug",
        serialize: (value) => value,
        parseValue: (value) => {
            validateCollectionSlug(value);
            return value;
        }
    }),
    Username: new GraphQLScalarType({
        name: "Username",
        serialize: (value) => value,
        parseValue: (value) => {
            validateUsername(value);
            return value;
        }
    }),
    EmailAddress: new GraphQLScalarType({
        name: "EmailAddress",
        serialize: (value) => value,
        parseValue: (value) => {
            validateEmailAddress(value);
            return value;
        }
    }),
    UsernameOrEmailAddress: new GraphQLScalarType({
        name: "UsernameOrEmailAddress",
        serialize: (value) => value,
        parseValue: (value) => {
            validateUsernameOrEmail(value);
            return value;
        }
    }),
    Date: new GraphQLScalarType({
        name: "Date",
        serialize: (value) => value,
        parseValue: (value) => new Date(value)
    }),
    User: {
        username: async (parent: User, _1: unknown, context: Context) => {
            return parent.username;
        },
        displayName: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);

            if (user.status === UserStatus.PENDING_SIGN_UP) {
                if (isAuthenticatedAsAdmin(context)) {
                    return user.emailAddress + " (pending sign up)";
                }

                const emailParts = user.emailAddress.split("@");
                return emailParts[0] + " (pending sign up)";
            }

            const returnValue = user.displayName || user.username;

            return returnValue;
        },
        firstName: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);
            if (isRequestingUserOrAdmin(context, user.username) || user.nameIsPublic) {
                return user.firstName || null;
            }

            return null;
        },
        lastName: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);
            if (isRequestingUserOrAdmin(context, user.username) || user.nameIsPublic) {
                return user.lastName || null;
            }

            return null;
        },
        emailAddress: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);
            if (isRequestingUserOrAdmin(context, user.username) || user.emailAddressIsPublic) {
                return user.emailAddress;
            }

            return null;
        },
        twitterHandle: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);
            if (isRequestingUserOrAdmin(context, user.username) || user.twitterHandleIsPublic) {
                return user.twitterHandle || null;
            }

            return null;
        },
        gitHubHandle: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);
            if (isRequestingUserOrAdmin(context, user.username) || user.gitHubHandleIsPublic) {
                return user.gitHubHandle || null;
            }

            return null;
        },
        website: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);
            if (isRequestingUserOrAdmin(context, user.username) || user.websiteIsPublic) {
                return user.website || null;
            }

            return null;
        },
        location: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);
            if (isRequestingUserOrAdmin(context, user.username) || user.locationIsPublic) {
                return user.location || null;
            }

            return null;
        },
        status: async (parent: User, _1: unknown, context: Context) => {
            const user = await getUserFromCacheOrDbByUsernameOrFail(context, parent.username);
            return user.status;
        },
        uiDarkModeEnabled: async (parent: User, _1: unknown, context: Context) => {
            if (Object.hasOwnProperty.call(context, "me")) {
                const authenticatedContext = context as AuthenticatedContext;

                const user = await getUserFromCacheOrDbByUsernameOrFail(authenticatedContext, parent.username);
                if (isRequestingUserOrAdmin(authenticatedContext, user.username)) {
                    return user.uiDarkModeEnabled;
                }
            }

            return false;
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
        isPublic: catalogIsPublic,
        unclaimed: catalogIsUnclaimed
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
        isPublic: packageIsPublic,
        updateMethods: packageUpdateMethods
    },
    PackageIssue: {
        author: getPackageIssueAuthor,
        packageIdentifier: getPackageIssuePackageIdentifier
    },
    PackageIssueComment: {
        author: getPackageIssueCommentAuthor
    },
    Version: {
        identifier: versionIdentifier,
        packageFile: modifiedPackageFile,
        canonicalPackageFile: canonicalPackageFile,
        author: versionAuthor,
        createdAt: versionCreatedAt,
        package: versionPackage,
        updatedAt: versionUpdatedAt,
        updateMethods: versionUpdateMethods
    },
    Follow: {
        package: followPackage
    },
    ActivityLog: {
        id: logId,
        propertiesEdited: logPropertiesEdited,
        user: logAuthor,
        targetPackage: logPackage,
        targetPackageIssue: logPackageIssue,
        targetCatalog: logCatalog,
        targetCollection: logCollection,
        targetUser: logUser,
        targetGroup: logGroup
    },
    Group: {
        myPermissions: myGroupPermissions,
        packagePermissions: packagePermissionsByGroupForUser,
        users: groupUsers,
        catalogPermissions: catalogPermissionsByGroupForUser,
        collectionPermissions: collectionPermissionsByGroupForUser
    },

    Query: {
        registryStatus: (_0: unknown, _1: unknown, context: AuthenticatedContext, info: GraphQLResolveInfo) => {
            return {
                status: RegistryStatus.SERVING_REQUESTS,
                version: DATAPM_VERSION,
                registryUrl: getEnvVariable("REGISTRY_URL") as string
            };
        },
        me: me,
        user: async (
            _0: unknown,
            args: { username: string },
            context: AuthenticatedContext,
            info: GraphQLResolveInfo
        ) => {
            return await getUserFromCacheOrDbByUsernameOrFail(context, args.username, getGraphQlRelationName(info));
        },

        catalog: getCatalogByIdentifierOrFail,
        myCatalogs: myCatalogs,

        myAPIKeys: myAPIKeys,

        package: findPackage,
        packageVersionsDiff: packageVersionsDiff,
        packageVersionsDiffs: packageVersionsDiffs,
        packageCollections: getPackageCollections,
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
        autoComplete: async (_0: unknown, { startsWith }, context: AutoCompleteContext, info: GraphQLResolveInfo) => {
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
            _0: unknown,
            { identifier }: { identifier: CatalogIdentifierInput },
            context: AuthenticatedContext,
            info: GraphQLResolveInfo
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
        adminSearchGroups,
        myActivity: myActivity,
        packageActivities: packageActivities,
        getFollow: getFollow,
        myFollows: getAllMyFollows,
        myFollowingActivity: myFollowingActivity,
        platformSettings: getPlatformSettingsByKey,
        publicPlatformSettingsByKey: getPublicPlatformSettingsByKeyOrFail,
        pageContent: getPageContentByRoute,
        packageFollowers: packageFollowers,
        packageIssueFollowers: packageIssueFollowers,
        catalogFollowers: catalogFollowers,
        collectionFollowers: collectionFollowers,
        userFollowers: userFollowers,
        packageFollowersCount: packageFollowersCount,
        packageIssueFollowersCount: packageIssueFollowersCount,
        catalogFollowersCount: catalogFollowersCount,
        collectionFollowersCount: collectionFollowersCount,
        userFollowersCount: userFollowersCount,
        listRepositories,
        groupsByPackage,
        groupsByCatalog,
        groupsByCollection,
        myGroups: myGroups,
        group: group,

        // Connectors
        listConnectors
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
        addOrUpdateGroupToCatalog: addOrUpdateGroupToCatalog,
        removeGroupFromCatalog: removeGroupFromCatalog,

        // Catalog Permissions
        setUserCatalogPermission: setUserCatalogPermission,
        deleteUserCatalogPermissions: deleteUserCatalogPermissions,

        // Package
        createPackage: createPackage,
        updatePackage: updatePackage,
        movePackage: movePackage,
        setPackageCoverImage: setPackageCoverImage,
        deletePackage: deletePackage,
        packageFetched: packageFetched,
        createRepository,
        deleteRepository,
        createCredential,
        deleteCredential,

        // Groups
        createGroup,
        updateGroup,
        deleteGroup,
        addOrUpdateUserToGroup,
        removeUserFromGroup,
        addOrUpdateGroupToPackage,
        removeGroupFromPackage,
        setGroupAsAdmin,
        adminDeleteGroup,

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
        addOrUpdateGroupToCollection: addOrUpdateGroupToCollection,
        removeGroupFromCollection: removeGroupFromCollection,

        // Collection Permissions
        setUserCollectionPermissions: setUserCollectionPermissions,
        deleteUserCollectionPermissions: deleteUserCollectionPermissions,

        // Version
        createVersion: createVersion,
        deleteVersion: deleteVersion,

        // Follow
        saveFollow: saveFollow,
        deleteFollow: deleteFollow,
        deleteAllMyFollows: deleteAllMyFollows,

        savePlatformSettings: savePlatformSettings,

        runJob
    }
};
