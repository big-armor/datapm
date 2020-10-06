import "./util/prototypeExtensions";
import { GraphQLScalarType } from "graphql";
import { UserRepository } from "./repository/UserRepository";
import {
  AuthenticatedContext,
  Context,
} from "./context";
import { PackageRepository } from "./repository/PackageRepository";
import { PackagePermissionRepository } from "./repository/PackagePermissionRepository";
import {
  MutationResolvers,
  QueryResolvers,
  UserResolvers,
  UserCatalogResolvers,
  CatalogResolvers,
  Permission,
  PackageResolvers,
  VersionResolvers,
  VersionConflict,
  PackageIdentifier,
  CollectionResolvers
} from "./generated/graphql";
import * as mixpanel from "./util/mixpanel";
import { getGraphQlRelationName , getRelationNames} from "./util/relationNames";
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
import fs from 'fs';

import AJV from 'ajv';
import { SemVer } from "semver";
import { ApolloError, UserInputError } from "apollo-server";

import {compatibilityToString,comparePackages,diffCompatibility,nextVersion, PackageFile, Compability} from 'datapm-lib';
import graphqlFields from "graphql-fields";
import { addPackageToCollection, createCollection, disableCollection, findCollectionBySlug, findCollectionsForAuthenticatedUser, removePackageFromCollection, searchCollections, updateCollection } from "./resolvers/CollectionResolver";
import { login, logout } from "./resolvers/AuthResolver";
import { createMe, disableMe, updateMe } from "./resolvers/UserResolver";
import { createAPIKey, deleteAPIKey } from "./resolvers/ApiKeyResolver";
import { Collection } from "./entity/Collection";
import { catalogPackagesForUser, createPackage, disablePackage, findPackage, findPackageIdentifier, findPackagesForCollection, getLatestPackages, removePackagePermissions, searchPackages, setPackagePermissions, updatePackage } from "./resolvers/PackageResolver";

export const resolvers: {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
  Date: GraphQLScalarType;
  User: UserResolvers;
  UserCatalog: UserCatalogResolvers;
  Catalog: CatalogResolvers;
  Collection: CollectionResolvers;
  Package: PackageResolvers;
  Version: VersionResolvers;
  PackageFileJSON: GraphQLScalarType;
} = {
  PackageFileJSON: new GraphQLScalarType({
    name: "PackageFileJSON",
    serialize: (value: any) => {
      return JSON.stringify(value);
    },
    parseValue: (value: any) => {

      const packageObject = JSON.parse(value);

      const ajv = new AJV();

      const schema = fs.readFileSync('node_modules/datapm-lib/packageFileSchema.json', 'utf8');

      const schemaObject = JSON.parse(schema);

      if(!ajv.validateSchema(schemaObject)) {
        throw new Error("AJV could not validate the schema");
      }

      const response = ajv.validate(schemaObject, packageObject);

      if(!response) {
        throw new Error("Error parsing Package File JSON: " + ajv.errors![0].message);//, "INVALID_PACKAGE_FILE", {path: ajv.errors![0].schemaPath});
      }

      return JSON.parse(value);
    },
  }),
  
  Date: new GraphQLScalarType({
    name: "Date",
    serialize: (value: any) => value,
    parseValue: (value: any) => new Date(value),
  }),
  UserCatalog: {
      permissions: (parent: any, _1: any, context: Context) => {
        const userCatalogPermission = parent as UserCatalogPermission;
        
        if(userCatalogPermission.user.username !== context.me?.username)
            return null;

        return parent.permissions;
      }
  },
  User: {

    firstName: (parent: any, _1: any, context: Context) => {
      const user = parent as User;

      if(user.nameIsPublic)
        return user.firstName || null;

      if(isAuthenticatedContext(context)
          && (context.me?.username === user.username))
        return user.firstName || null;

      return null;
      
    },
    lastName: (parent: any, _1: any, context: AuthenticatedContext) => {
      const user = parent as User;
      
      if(user.nameIsPublic)
        return user.lastName || null;

      if(isAuthenticatedContext(context)
          && (context.me?.username === user.username))
        return user.lastName || null;

      return null;
      
    }
  },
  Catalog: {

    identifier: async (parent: any, _1: any) => {

      const catalog = parent as Catalog;

      return {
        registryHostname: getEnvVariable("REGISTRY_HOSTNAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: catalog.slug,
      };

    },
    packages: catalogPackagesForUser
  },
  Collection: {
    identifier: async (parent: any, _1: any) => {
      const collection = parent as Collection;
      return {
        registryHostname: getEnvVariable("REGISTRY_HOSTNAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        collectionSlug: collection.collectionSlug,
      };
    },
    packages: findPackagesForCollection
  },

  Package: {

    latestVersion: async(parent: any, _1: any, context: AuthenticatedContext, info: any): Promise<Version | null> =>{

      const packageEntity = parent as Package;

      const catalog = await context.connection.getCustomRepository(CatalogRepository).findOne({where: {id: packageEntity.catalogId}});

      if(catalog === undefined)
        throw new ApolloError('Could not find catalog ' + packageEntity.catalogId, "CATALOG_NOT_FOUND");

      const identifier:PackageIdentifier = {
        registryHostname: getEnvVariable("REGISTRY_HOSTNAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: catalog.slug,
        packageSlug: packageEntity.slug
      }

      const version = await context.connection.getCustomRepository(VersionRepository).findLatestVersion({identifier: identifier, relations: getGraphQlRelationName(info)});

      
      if(version == undefined)
        return null;

      return version;
    },

    identifier: findPackageIdentifier
  },

  Version: {

    identifier: async (parent: any, _1: any, context: AuthenticatedContext) => {

      const version = parent as Version;

      const packageEntity = await context.connection.getRepository(Package).findOneOrFail({id: version.packageId});

      const catalog = await context.connection.getRepository(Catalog).findOneOrFail({id: packageEntity.catalogId });

      return {
        registryHostname: getEnvVariable("REGISTRY_HOSTNAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: catalog.slug,
        packageSlug: packageEntity.slug,
        versionMajor: version.majorVersion,
        versionMinor: version.minorVersion,
        versionPatch: version.patchVersion
      };

    }
  },

  Query: {
    me: async (_0: any, _1: any, context: AuthenticatedContext, info: any) => {
      
      const user = await context.connection.getCustomRepository(UserRepository).findUserByUserName({
        username: context.me.username,
        relations: getGraphQlRelationName(info),
      })

      return user;
    
  },

    user: async (
      _0: any,
      args: {username: string},
      context: AuthenticatedContext,
      info: any
    ) => {
      const user = await context.connection.getCustomRepository(UserRepository)
      .findUser({
        username: args.username,
        relations: getGraphQlRelationName(info),
      });

      return user;
    },

    catalog: async (
      _0: any,
      { identifier },
      context: AuthenticatedContext,
      info: any
    ) =>
      {

        const graphQLRelationName = getGraphQlRelationName(info);

        const catalog = await context.connection.getCustomRepository(CatalogRepository)
          .findCatalogBySlug({
            slug: identifier.catalogSlug,
            relations: graphQLRelationName,
          });

        if(catalog == null) {
          throw new UserInputError("CATALOG_NOT_FOUND");
        }
          
        return  catalog;
    },

    myCatalogs: async (
      _0: any,
      {},
      context: AuthenticatedContext) => {

      const permissions = await context.connection.manager.getCustomRepository(UserCatalogPermissionRepository).findByUser({username: context.me?.username, relations: ["catalog"]});
      
      return permissions.filter(p => p.catalog != null).map(p => p.catalog);

    },

    myAPIKeys: async (
      _0: any,
      {},
      context: AuthenticatedContext) => {

      const apiKeys = await context.connection.manager
      .getCustomRepository(APIKeyRepository)
      .findByUser(context.me?.id);
      
      return apiKeys;

    },

    package: findPackage,
    latestPackages: getLatestPackages,

    collection: findCollectionBySlug,
    collections: findCollectionsForAuthenticatedUser,
    searchCollections: searchCollections,
    
    autoComplete: async(
      _0: any,
      {startsWith},
      context: AuthenticatedContext,
      info: any
    ) => {

      const catalogs = context
        .connection
        .manager
        .getCustomRepository(CatalogRepository)
        .autocomplete({user: context.me, startsWith, relations: getRelationNames(graphqlFields(info).catalogs)});

      const packages = context
        .connection
        .manager
        .getCustomRepository(PackageRepository)
        .autocomplete({user: context.me,startsWith, relations: getRelationNames(graphqlFields(info).packages)});

      return {
        catalogs: await catalogs,
        packages: await packages
      }
    },

    searchCatalogs: async(
      _0: any,
      {query, limit, offSet},
      context: AuthenticatedContext,
      info: any
    ) => {

      const [searchResponse,count] = await context
        .connection
        .manager
        .getCustomRepository(CatalogRepository)
        .search({user: context.me, query,limit, offSet, relations: getRelationNames(graphqlFields(info).catalogs)});

      return {
        hasMore: count - (offSet + limit) > 0,
        catalogs: searchResponse,
        count
      }
    },

    searchPackages: searchPackages,
    
    usernameAvailable: async(
      _0: any,
      {username},
      context: AuthenticatedContext) => {

      const user = await context
        .connection
        .manager
        .getCustomRepository(UserRepository)
        .getUserByUsername(username);


      const catalog = await context
        .connection
        .manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlug({slug: username});

      return user == null && catalog == null;
    },

    emailAddressAvailable: async(
      _0: any,
      {emailAddress},
      context: AuthenticatedContext) => {
  
      const user = await context
        .connection
        .manager
        .getCustomRepository(UserRepository)
        .getUserByEmail(emailAddress);
  
      return user == null;
    }

  },

  Mutation: {
    // Auth
    login: login,
    logout: logout,

    // User
    createMe: createMe,
    updateMe: updateMe,
    disableMe: disableMe,

    // API Keys
    createAPIKey: createAPIKey,
    deleteAPIKey: deleteAPIKey,

    removeUserFromCatalog: async (
      _0: any,
      { username, catalogSlug },
      context: AuthenticatedContext,
      info: any
    ) => {

      const catalog = await context.connection.manager.getCustomRepository(CatalogRepository)
        .findCatalogBySlug({slug: catalogSlug});

      if(catalog === undefined) {
        throw new UserInputError("CATALOG_NOT_FOUND");
      }

      return context.connection.manager
        .getCustomRepository(UserRepository)
        .removeUserFromCatalog({
          username: username,
          catalog: catalog,
          relations: getGraphQlRelationName(info),
        });

    },

    createCatalog: async (
      _0: any,
      { value },
      context: AuthenticatedContext, 
      info: any
    ) => {
      return context.connection.manager
        .getCustomRepository(CatalogRepository)
        .createCatalog({
          username: context.me?.username,
          value,
          relations: getGraphQlRelationName(info)
        });
    },


    updateCatalog: async (
      _0: any,
      { identifier,value },
      context: AuthenticatedContext, 
      info: any
    ) => {
      return context.connection.manager
        .getCustomRepository(CatalogRepository)
        .updateCatalog({
          identifier,
          value,
          relations: getGraphQlRelationName(info)
        });
    },

    disableCatalog: async (
      _0: any,
      { identifier },
      context:AuthenticatedContext,
      info: any
    ) => {
      return context.connection.manager
        .getCustomRepository(CatalogRepository)
        .disableCatalog({
          slug: identifier.catalogSlug,
          relations: getGraphQlRelationName(info)
        });
    },

    createPackage: createPackage,
    updatePackage: updatePackage,
    disablePackage: disablePackage,

    setPackagePermissions: setPackagePermissions,
    removePackagePermissions: removePackagePermissions,

    createCollection: createCollection,
    updateCollection: updateCollection,
    disableCollection: disableCollection,
    addPackageToCollection: addPackageToCollection,
    removePackageFromCollection: removePackageFromCollection,

    createVersion: async(
      _0: any,
      {identifier, value},
      context: AuthenticatedContext,
      info: any
    ) => {

        return await context.connection.manager.nestedTransaction(async (transaction) => {

          const proposedNewVersion = new SemVer(
            value.packageFile.version
          );

          const newPackageFile = value.packageFile as PackageFile;

          // get the latest version
          const latestVersion = await transaction.getCustomRepository(VersionRepository)
            .findLatestVersion({identifier});

      

          if(latestVersion != null) {

            const latestVersionSemVer = new SemVer(latestVersion.packageFile!.version);

            
            const diff = comparePackages(latestVersion.packageFile, newPackageFile);

            const compatibility = diffCompatibility(diff);

            const minNextVersion = nextVersion(latestVersionSemVer,compatibility);

            const minVersionCompare = minNextVersion.compare(proposedNewVersion);


            if(compatibility == Compability.Identical) {
              throw new ApolloError(
                identifier.catalogSlug + "/" + identifier.packageSlug + "/" + latestVersionSemVer.version + " already exists, and the submission is identical to it",
                VersionConflict.VERSION_EXISTS,
                {existingVersion: latestVersionSemVer.version}
              )
            }
            if(minVersionCompare == 1) {
              throw new ApolloError(
                identifier.catalogSlug + "/" + identifier.packageSlug + " has current version " + latestVersionSemVer.version + ", and this new version has " + compatibilityToString(compatibility) + " changes - requiring a minimum version number of " + minNextVersion.version + ", but you submitted version number " + proposedNewVersion.version,
                VersionConflict.HIGHER_VERSION_REQUIRED,
                {existingVersion: latestVersionSemVer.version, minNextVersion: minNextVersion.version}
              )
            }

          }


          const savedVersion = await transaction
          .getCustomRepository(VersionRepository)
            .save(context.me.id, identifier, value);

          const ALIAS = "findVersion";
          const recalledVersion = await transaction
          .getRepository(Version)
          .createQueryBuilder(ALIAS)
          .addRelations(ALIAS, getGraphQlRelationName(info))
          .where({ id: savedVersion.id })
          .getOne();

          if(recalledVersion === undefined)
            throw new Error("Could not find the version after saving. This should never happen!");
          
          return recalledVersion;
        });

    },

    disableVersion: async(
      _0: any,
      {identifier},
      context: AuthenticatedContext) => {

      await context.connection.manager.nestedTransaction( async (transaction) => {
        const version = await transaction.getCustomRepository(VersionRepository)
        .findOneOrFail(
          {identifier}
        );

        version.isActive = false;
        transaction.save(version);
      });
      
    },

  
    track: (_, { actions }, context: Context) =>
      mixpanel.track(actions, context.request),

  },


};
