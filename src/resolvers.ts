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
  PackageIdentifier,
  VersionResolvers,
} from "./generated/graphql";
import * as mixpanel from "./util/mixpanel";
import { getGraphQlRelationName } from "./util/relationNames";
import { CatalogRepository } from "./repository/CatalogRepository";
import { Catalog } from "./entity/Catalog";
import { APIKey } from "./entity/APIKey";
import { APIKeyRepository } from "./repository/APIKeyRepository";
import { User } from "./entity/User";
import { UserCatalogPermission } from "./entity/UserCatalogPermission";
import { UserCatalogPermissionRepository } from "./repository/CatalogPermissionRepository";
import { Permissions } from "./entity/Permissions";
import { isAuthenticatedContext } from "./util/contextHelpers";
import { Version } from "./entity/Version";
import { Package } from "./entity/Package";
import { catalogIdentifier } from "./util/IdentifierUtil";
import { VersionRepository } from "./repository/VersionRepository";
import { getEnvVariable } from "./util/getEnvVariable";
import fs from 'fs';

import AJV from 'ajv';


export const resolvers: {
  Query: QueryResolvers;
  Mutation: MutationResolvers;
  Date: GraphQLScalarType;
  User: UserResolvers;
  UserCatalog: UserCatalogResolvers;
  Catalog: CatalogResolvers;
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

      const schema = fs.readFileSync('src/packageFileSchema.json', 'utf8');

      const schemaObject = JSON.parse(schema);

      if(!ajv.validateSchema(schemaObject)) {
        throw new Error("AJV could not validate the schema");
      }

      const response = ajv.validate(schemaObject, packageObject);

      if(!response) {
        throw new Error("Error parsing Package File JSON: " + ajv.errors![0].message);
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
      permissions: (parent: any, _1: any, context: Context, info: any) => {
        const userCatalogPermission = parent as UserCatalogPermission;
        
        if(userCatalogPermission.user.username !== context.me?.username)
            return null;

        return parent.permissions;
      }
  },
  User: {

    firstName: (parent: any, _1: any, context: Context, info: any) => {
      const user = parent as User;

      if(user.nameIsPublic)
        return user.firstName;

      if(isAuthenticatedContext(context)
          && (context.me?.isSiteAdmin
            || context.me?.username === user.username))
        return user.firstName;

      return null;
      
    },
    lastName: (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
      const user = parent as User;
      
      if(user.nameIsPublic)
        return user.lastName;

      if(isAuthenticatedContext(context)
          && (context.me?.isSiteAdmin
            || context.me?.username === user.username))
        return user.lastName;

      return null;
      
    }
  },
  Catalog: {
   
    identifier: async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {

      const catalog = parent as Catalog;

      return {
        registryHostname: getEnvVariable("REGISTRY_HOSTNAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: catalog.slug,
      };

    }
  },

  Package: {

    identifier: async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {

      const packageEntity = parent as Package;

      // Find the catalog
      const catalog = await context.connection.getRepository(Catalog).findOneOrFail({id: packageEntity.catalogId });

      return {
        registryHostname: getEnvVariable("REGISTRY_HOSTNAME"),
        registryPort: Number.parseInt(getEnvVariable("REGISTRY_PORT")),
        catalogSlug: catalog.slug,
        packageSlug: packageEntity.slug
      };

    }
  },

  Version: {

    identifier: async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {

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
      
      const user = await context.connection.getCustomRepository(UserRepository).findMe({
        id: context.me.id,
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

        const catalog = await context.connection.getCustomRepository(CatalogRepository)
          .findCatalogBySlug({
            slug: identifier.catalogSlug,
            relations: getGraphQlRelationName(info),
          });
          
        return  catalog;
      },

      myCatalogs: async (
        _0: any,
        {},
        context: AuthenticatedContext,
        info: any
      ) => {

        const permissions = await context.connection.manager.getCustomRepository(UserCatalogPermissionRepository).findByUser({username: context.me?.username, relations: ["catalog"]});
        
        return permissions.filter(p => p.catalog != null).map(p => p.catalog);
  
      },

    package: async (_0: any, { identifier }, context: AuthenticatedContext, info: any) => {
      
      const packageEntity = await context.connection.getCustomRepository(PackageRepository).findPackageOrFail({
        identifier,
        relations: getGraphQlRelationName(info),
      });

      console.log(`package found - ${JSON.stringify(packageEntity)}`);

      return packageEntity;
    }


  },

  Mutation: {

    createMe: async (
      _0: any,
      { value },
      context: AuthenticatedContext,
      info: any
    ) => {
      const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .createUser({
          value,
          relations: getGraphQlRelationName(info),
        })

      return user;
    },


    updateMe: async (
      _0: any,
      { value },
      context: AuthenticatedContext,
      info: any
    ) =>{
        const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .updateUser({
          me: context.me, 
          value,
          relations: getGraphQlRelationName(info),
        })

        return user;
    },
      

    createAPIKey: async (
      _0: any,
      {},
      context: AuthenticatedContext, 
      info: any
    ) => {

      const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .findUser({
          username: context.me.username,
        });

      if(!user) {
        throw new Error("User not found - this should not happen");
      }

      return context.connection.manager
      .getCustomRepository(APIKeyRepository)
      .createAPIKey({
        user,
        relations: getGraphQlRelationName(info)
      })
    },

    deleteAPIKey: (
      _0: any,
      { key },
      context: AuthenticatedContext,
      info: any
    ) =>
      context.connection.manager
        .getCustomRepository(APIKeyRepository)
        .deleteAPIKey({key,relations : getGraphQlRelationName(info)})
    ,

    removeUserFromCatalog: (
      _0: any,
      { username, catalogSlug },
      context: AuthenticatedContext,
      info: any
    ) =>
      context.connection.manager
        .getCustomRepository(UserRepository)
        .removeUserFromCatalog({
          username: username,
          catalogSlug: catalogSlug,
          relations: getGraphQlRelationName(info),
        }),

    disableMe: async (
      _0: any,
      { },
      context: AuthenticatedContext,
      info: any
    ) => {
      const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .markUserActiveStatus({
          username: context.me.username,
          active: false,
          relations: getGraphQlRelationName(info),
        })
      return user;
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

    
   
    createPackage: async (
      _0: any,
      { value },
      context: AuthenticatedContext,
      info: any
    ) => {
      return context.connection.getCustomRepository(PackageRepository).createPackage({
        userId: context.me?.id,
        packageInput: value,
        relations: getGraphQlRelationName(info),
      });
    },

    updatePackage: async (
      _0: any,
      { identifier, value },
      context: AuthenticatedContext,
      info: any
    ) => {

      if(value.newCatalogSlug) {
        // check that this user has the right to move this package to a different catalog
        const hasPermission = await context.connection.getCustomRepository(UserCatalogPermissionRepository).userHasPermission({
          username: context.me.username,
          catalogSlug: value.newCatalogSlug,
          permission: Permission.Create,
        });

        if(!hasPermission)
          throw new Error("You do not have Edit permission for this package");

      }


      return context.connection.getCustomRepository(PackageRepository).updatePackage({
        catalogSlug: identifier.catalogSlug,
        packageSlug: identifier.packageSlug,
        packageInput: value,
        relations: getGraphQlRelationName(info),
      });
    },

    disablePackage: async (
      _0: any,
      { identifier },
      context: AuthenticatedContext,
      info: any
    ) => {
      return context.connection.getCustomRepository(PackageRepository).disablePackage({
        identifier,
        relations: getGraphQlRelationName(info),
      });


    },

    setPackagePermissions: async (
      _0: any,
      { identifier, value: { username, permissions }},
      context: AuthenticatedContext,
      info: any
    ) => {
       return context.connection
        .getCustomRepository(PackagePermissionRepository)
        .setPackagePermissions({
          identifier,
          username,
          permissions,
          relations: getGraphQlRelationName(info),
        });

    },

    removePackagePermissions: async (
      _0: any,
      { identifier, username },
      context: AuthenticatedContext,
      info: any
    ) => {
      
      context.connection
        .getCustomRepository(PackagePermissionRepository)
        .removePackagePermission({
          identifier,
          username
        });
    },

    createVersion: async(
      _0: any,
      {identifier, value},
      context: AuthenticatedContext,
      info: any
    ) => {

        return await context.connection.manager.nestedTransaction(async (transaction) => {
          const version = await transaction
          .getCustomRepository(VersionRepository)
          .save(identifier,value);
  
          const savedVersion = await transaction
            .getRepository(Version)
            .findOne({where: {id: version.id}, relations: getGraphQlRelationName(info)});
  
          if(savedVersion === undefined)
            throw new Error(`Could not find resolved version ${version.id} - this should never happen!`);
  
            return savedVersion;
        });

    },

    disableVersion: async(
      _0: any,
      {identifier},
      context: AuthenticatedContext,
      info: any
    ) => {

      await context.connection.manager.nestedTransaction( async (transaction) => {
        const version = await transaction.getCustomRepository(VersionRepository)
        .findOneOrFail(
          {identifier}
        );

        version.isActive = false;
        transaction.save(version);
      });
      
    },

  
    mixpanelTrack: (_, { actions }, context: Context) =>
      mixpanel.track(actions, context.request),
    mixpanelEngage: (_, { userInfo }, context: Context) =>
      mixpanel.engage(userInfo, context.request),

  },


};
