import { FileUpload } from 'graphql-upload'
import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type RequireFields<T, K extends keyof T> = { [X in Exclude<keyof T, K>]?: T[X] } & { [P in K]-?: NonNullable<T[P]> };

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Date: Date;
  PackageFileJSON: any;
  Void: any;
  JSON: { [key: string]: any };
  Long: any;
  Object: any;
};






export type ApiKey = {
  __typename?: 'APIKey';
  key: Scalars['String'];
  createdAt?: Maybe<Scalars['Date']>;
  lastUsed?: Maybe<Scalars['Date']>;
};

export type ApiKeyWithSecret = {
  __typename?: 'APIKeyWithSecret';
  key: Scalars['String'];
  secret: Scalars['String'];
  createdAt?: Maybe<Scalars['Date']>;
};

export type BooleanWrapper = {
  val: Scalars['Boolean'];
};

export type Catalog = {
  __typename?: 'Catalog';
  identifier: CatalogIdentifier;
  displayName: Scalars['String'];
  description: Scalars['String'];
  website: Scalars['String'];
  isPublic: Scalars['Boolean'];
  userPermissions?: Maybe<Array<UserCatalog>>;
  packages: Array<Maybe<Package>>;
};

export type CatalogIdentifier = {
  __typename?: 'CatalogIdentifier';
  registryHostname: Scalars['String'];
  registryPort: Scalars['Int'];
  catalogSlug: Scalars['String'];
};

export type CatalogIdentifierInput = {
  registryHostname: Scalars['String'];
  registryPort: Scalars['Int'];
  catalogSlug: Scalars['String'];
};

export type Collection = {
  __typename?: 'Collection';
  identifier: CollectionIdentifier;
  displayName: Scalars['String'];
  description: Scalars['String'];
  packages?: Maybe<Array<Package>>;
};

export type CollectionIdentifier = {
  __typename?: 'CollectionIdentifier';
  registryHostname: Scalars['String'];
  registryPort: Scalars['Int'];
  collectionSlug: Scalars['String'];
};

export type CollectionIdentifierInput = {
  registryHostname: Scalars['String'];
  registryPort: Scalars['Int'];
  collectionSlug: Scalars['String'];
};

export type CreateCatalogInput = {
  slug: Scalars['String'];
  displayName: Scalars['String'];
  description: Scalars['String'];
  website?: Maybe<Scalars['String']>;
  isPublic: Scalars['Boolean'];
};

export type CreatePackageInput = {
  packageSlug: Scalars['String'];
  catalogSlug: Scalars['String'];
  displayName: Scalars['String'];
  description: Scalars['String'];
};

export type CreateUserInput = {
  firstName: Scalars['String'];
  lastName: Scalars['String'];
  emailAddress: Scalars['String'];
  username: Scalars['String'];
};

export type CreateUserInputAdmin = {
  firstName: Scalars['String'];
  lastName: Scalars['String'];
  emailAddress: Scalars['String'];
  username: Scalars['String'];
  isSiteAdmin: Scalars['Boolean'];
};

export type CreateVersionInput = {
  packageFile?: Maybe<Scalars['PackageFileJSON']>;
};


export type DateWrapper = {
  val?: Maybe<Scalars['Date']>;
};

export type IntWrapper = {
  val?: Maybe<Scalars['Int']>;
};



export type Mutation = {
  __typename?: 'Mutation';
  createMe: User;
  updateMe: User;
  disableMe: User;
  createAPIKey: ApiKeyWithSecret;
  deleteAPIKey?: Maybe<ApiKey>;
  removeUserFromCatalog: User;
  createCatalog: Catalog;
  updateCatalog: Catalog;
  disableCatalog: Catalog;
  createPackage: Package;
  updatePackage: Package;
  disablePackage: Package;
  setPackagePermissions: UserPackagePermissions;
  removePackagePermissions?: Maybe<Scalars['Void']>;
  createVersion: Version;
  disableVersion: Scalars['Void'];
  mixpanelTrack: Scalars['Int'];
  mixpanelEngage: Scalars['Int'];
};


export type MutationCreateMeArgs = {
  value: CreateUserInput;
};


export type MutationUpdateMeArgs = {
  value: UpdateUserInput;
};


export type MutationDeleteApiKeyArgs = {
  key: Scalars['String'];
};


export type MutationRemoveUserFromCatalogArgs = {
  username: Scalars['String'];
  catalogSlug: Scalars['String'];
};


export type MutationCreateCatalogArgs = {
  value: CreateCatalogInput;
};


export type MutationUpdateCatalogArgs = {
  identifier: CatalogIdentifierInput;
  value: UpdateCatalogInput;
};


export type MutationDisableCatalogArgs = {
  identifier: CatalogIdentifierInput;
};


export type MutationCreatePackageArgs = {
  value: CreatePackageInput;
};


export type MutationUpdatePackageArgs = {
  identifier: PackageIdentifierInput;
  value: UpdatePackageInput;
};


export type MutationDisablePackageArgs = {
  identifier: PackageIdentifierInput;
};


export type MutationSetPackagePermissionsArgs = {
  identifier: PackageIdentifierInput;
  value: SetPackagePermissionInput;
};


export type MutationRemovePackagePermissionsArgs = {
  identifier: PackageIdentifierInput;
  username: Scalars['String'];
};


export type MutationCreateVersionArgs = {
  identifier: PackageIdentifierInput;
  value: CreateVersionInput;
};


export type MutationDisableVersionArgs = {
  identifier: VersionIdentifierInput;
};


export type MutationMixpanelTrackArgs = {
  actions: Scalars['JSON'];
};


export type MutationMixpanelEngageArgs = {
  userInfo: Scalars['JSON'];
};

export type MyCatalog = {
  __typename?: 'MyCatalog';
  catalog: Catalog;
  permission?: Maybe<Array<Permission>>;
};


export type Package = {
  __typename?: 'Package';
  identifier: PackageIdentifier;
  catalog: Catalog;
  displayName: Scalars['String'];
  description: Scalars['String'];
  latestVersion?: Maybe<Version>;
  versions: Array<Maybe<Version>>;
};


export type PackageIdentifier = {
  __typename?: 'PackageIdentifier';
  registryHostname: Scalars['String'];
  registryPort: Scalars['Int'];
  catalogSlug: Scalars['String'];
  packageSlug: Scalars['String'];
};

export type PackageIdentifierInput = {
  registryHostname: Scalars['String'];
  registryPort: Scalars['Int'];
  catalogSlug: Scalars['String'];
  packageSlug: Scalars['String'];
};

export enum Permission {
  Manage = 'MANAGE',
  Create = 'CREATE',
  View = 'VIEW',
  Edit = 'EDIT',
  Delete = 'DELETE',
  None = 'NONE'
}

export enum Protocol {
  Http = 'HTTP',
  LocalFile = 'LOCAL_FILE'
}

export type Query = {
  __typename?: 'Query';
  me: User;
  search?: Maybe<SearchResponse>;
  user?: Maybe<User>;
  myCatalogs: Array<Maybe<Catalog>>;
  usersByCatalog: Array<Maybe<User>>;
  catalog?: Maybe<Catalog>;
  package?: Maybe<Package>;
  collections?: Maybe<Array<Collection>>;
};


export type QuerySearchArgs = {
  search: Scalars['String'];
};


export type QueryUserArgs = {
  username: Scalars['String'];
};


export type QueryUsersByCatalogArgs = {
  identifier: CatalogIdentifierInput;
};


export type QueryCatalogArgs = {
  identifier: CatalogIdentifierInput;
};


export type QueryPackageArgs = {
  identifier: PackageIdentifierInput;
};

export type SearchResponse = {
  __typename?: 'SearchResponse';
  catalogs?: Maybe<Array<Maybe<Catalog>>>;
  packages?: Maybe<Array<Maybe<Package>>>;
};

export type SetPackagePermissionInput = {
  username: Scalars['String'];
  permissions: Array<Permission>;
};

export type StringWrapper = {
  val?: Maybe<Scalars['String']>;
};

export type UpdateCatalogInput = {
  newSlug?: Maybe<Scalars['String']>;
  displayName?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
};

export type UpdatePackageInput = {
  newCatalogSlug?: Maybe<Scalars['String']>;
  newPackageSlug?: Maybe<Scalars['String']>;
  displayName?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
  isPublic?: Maybe<Scalars['Boolean']>;
};

export type UpdateUserInput = {
  newUsername?: Maybe<Scalars['String']>;
  firstName?: Maybe<Scalars['String']>;
  lastName?: Maybe<Scalars['String']>;
  email?: Maybe<Scalars['String']>;
};

export type User = {
  __typename?: 'User';
  username: Scalars['String'];
  firstName?: Maybe<Scalars['String']>;
  lastName?: Maybe<Scalars['String']>;
  location?: Maybe<Scalars['String']>;
  twitterHandle?: Maybe<Scalars['String']>;
  website?: Maybe<Scalars['String']>;
  emailAddress?: Maybe<Scalars['String']>;
  gitHubHandle?: Maybe<Scalars['String']>;
  nameIsPublic: Scalars['Boolean'];
};

export type UserCatalog = {
  __typename?: 'UserCatalog';
  user: User;
  catalog: Catalog;
  permissions?: Maybe<Array<Permission>>;
};

export type UserPackage = {
  __typename?: 'UserPackage';
  user: User;
  package: Package;
  permissions?: Maybe<Array<Permission>>;
};

export type UserPackagePermissions = {
  __typename?: 'UserPackagePermissions';
  package: Package;
  username: Scalars['String'];
  permissions: Array<Permission>;
};

export type Version = {
  __typename?: 'Version';
  identifier: VersionIdentifier;
  createdAt: Scalars['Date'];
  updatedAt: Scalars['Date'];
  package: Package;
  packageFile?: Maybe<Scalars['PackageFileJSON']>;
};

export enum VersionConflict {
  VersionExists = 'VERSION_EXISTS',
  HigherVersionExists = 'HIGHER_VERSION_EXISTS',
  HigherVersionRequired = 'HIGHER_VERSION_REQUIRED'
}

export type VersionIdentifier = {
  __typename?: 'VersionIdentifier';
  registryHostname: Scalars['String'];
  registryPort: Scalars['Int'];
  catalogSlug: Scalars['String'];
  packageSlug: Scalars['String'];
  versionMajor: Scalars['Int'];
  versionMinor: Scalars['Int'];
  versionPatch: Scalars['Int'];
};

export type VersionIdentifierInput = {
  registryHostname: Scalars['String'];
  registryPort: Scalars['Int'];
  catalogSlug: Scalars['String'];
  packageSlug: Scalars['String'];
  versionMajor: Scalars['Int'];
  versionMinor: Scalars['Int'];
  versionPatch: Scalars['Int'];
};


export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type LegacyStitchingResolver<TResult, TParent, TContext, TArgs> = {
  fragment: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};

export type NewStitchingResolver<TResult, TParent, TContext, TArgs> = {
  selectionSet: string;
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type StitchingResolver<TResult, TParent, TContext, TArgs> = LegacyStitchingResolver<TResult, TParent, TContext, TArgs> | NewStitchingResolver<TResult, TParent, TContext, TArgs>;
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
  | ResolverFn<TResult, TParent, TContext, TArgs>
  | StitchingResolver<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterator<TResult> | Promise<AsyncIterator<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}> = (obj: T, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  Query: ResolverTypeWrapper<{}>;
  User: ResolverTypeWrapper<User>;
  String: ResolverTypeWrapper<Scalars['String']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']>;
  SearchResponse: ResolverTypeWrapper<SearchResponse>;
  Catalog: ResolverTypeWrapper<Catalog>;
  CatalogIdentifier: ResolverTypeWrapper<CatalogIdentifier>;
  Int: ResolverTypeWrapper<Scalars['Int']>;
  UserCatalog: ResolverTypeWrapper<UserCatalog>;
  Permission: Permission;
  Package: ResolverTypeWrapper<Package>;
  PackageIdentifier: ResolverTypeWrapper<PackageIdentifier>;
  Version: ResolverTypeWrapper<Version>;
  VersionIdentifier: ResolverTypeWrapper<VersionIdentifier>;
  Date: ResolverTypeWrapper<Scalars['Date']>;
  PackageFileJSON: ResolverTypeWrapper<Scalars['PackageFileJSON']>;
  CatalogIdentifierInput: CatalogIdentifierInput;
  PackageIdentifierInput: PackageIdentifierInput;
  Collection: ResolverTypeWrapper<Collection>;
  CollectionIdentifier: ResolverTypeWrapper<CollectionIdentifier>;
  Mutation: ResolverTypeWrapper<{}>;
  CreateUserInput: CreateUserInput;
  UpdateUserInput: UpdateUserInput;
  APIKeyWithSecret: ResolverTypeWrapper<ApiKeyWithSecret>;
  APIKey: ResolverTypeWrapper<ApiKey>;
  CreateCatalogInput: CreateCatalogInput;
  UpdateCatalogInput: UpdateCatalogInput;
  CreatePackageInput: CreatePackageInput;
  UpdatePackageInput: UpdatePackageInput;
  SetPackagePermissionInput: SetPackagePermissionInput;
  UserPackagePermissions: ResolverTypeWrapper<UserPackagePermissions>;
  Void: ResolverTypeWrapper<Scalars['Void']>;
  CreateVersionInput: CreateVersionInput;
  VersionIdentifierInput: VersionIdentifierInput;
  JSON: ResolverTypeWrapper<Scalars['JSON']>;
  Long: ResolverTypeWrapper<Scalars['Long']>;
  Object: ResolverTypeWrapper<Scalars['Object']>;
  VersionConflict: VersionConflict;
  Protocol: Protocol;
  MyCatalog: ResolverTypeWrapper<MyCatalog>;
  UserPackage: ResolverTypeWrapper<UserPackage>;
  StringWrapper: StringWrapper;
  IntWrapper: IntWrapper;
  DateWrapper: DateWrapper;
  BooleanWrapper: BooleanWrapper;
  CollectionIdentifierInput: CollectionIdentifierInput;
  CreateUserInputAdmin: CreateUserInputAdmin;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  Query: {};
  User: User;
  String: Scalars['String'];
  Boolean: Scalars['Boolean'];
  SearchResponse: SearchResponse;
  Catalog: Catalog;
  CatalogIdentifier: CatalogIdentifier;
  Int: Scalars['Int'];
  UserCatalog: UserCatalog;
  Package: Package;
  PackageIdentifier: PackageIdentifier;
  Version: Version;
  VersionIdentifier: VersionIdentifier;
  Date: Scalars['Date'];
  PackageFileJSON: Scalars['PackageFileJSON'];
  CatalogIdentifierInput: CatalogIdentifierInput;
  PackageIdentifierInput: PackageIdentifierInput;
  Collection: Collection;
  CollectionIdentifier: CollectionIdentifier;
  Mutation: {};
  CreateUserInput: CreateUserInput;
  UpdateUserInput: UpdateUserInput;
  APIKeyWithSecret: ApiKeyWithSecret;
  APIKey: ApiKey;
  CreateCatalogInput: CreateCatalogInput;
  UpdateCatalogInput: UpdateCatalogInput;
  CreatePackageInput: CreatePackageInput;
  UpdatePackageInput: UpdatePackageInput;
  SetPackagePermissionInput: SetPackagePermissionInput;
  UserPackagePermissions: UserPackagePermissions;
  Void: Scalars['Void'];
  CreateVersionInput: CreateVersionInput;
  VersionIdentifierInput: VersionIdentifierInput;
  JSON: Scalars['JSON'];
  Long: Scalars['Long'];
  Object: Scalars['Object'];
  MyCatalog: MyCatalog;
  UserPackage: UserPackage;
  StringWrapper: StringWrapper;
  IntWrapper: IntWrapper;
  DateWrapper: DateWrapper;
  BooleanWrapper: BooleanWrapper;
  CollectionIdentifierInput: CollectionIdentifierInput;
  CreateUserInputAdmin: CreateUserInputAdmin;
}>;

export type IsAuthenticatedDirectiveArgs = {  };

export type IsAuthenticatedDirectiveResolver<Result, Parent, ContextType = any, Args = IsAuthenticatedDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type HasCatalogPermissionDirectiveArgs = {   permission?: Maybe<Permission>; };

export type HasCatalogPermissionDirectiveResolver<Result, Parent, ContextType = any, Args = HasCatalogPermissionDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type HasPackagePermissionDirectiveArgs = {   permission?: Maybe<Permission>; };

export type HasPackagePermissionDirectiveResolver<Result, Parent, ContextType = any, Args = HasPackagePermissionDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type IsSiteAdminDirectiveArgs = {  };

export type IsSiteAdminDirectiveResolver<Result, Parent, ContextType = any, Args = IsSiteAdminDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type IsUserOrAdminDirectiveArgs = {  };

export type IsUserOrAdminDirectiveResolver<Result, Parent, ContextType = any, Args = IsUserOrAdminDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type ApiKeyResolvers<ContextType = any, ParentType extends ResolversParentTypes['APIKey'] = ResolversParentTypes['APIKey']> = ResolversObject<{
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  lastUsed?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type ApiKeyWithSecretResolvers<ContextType = any, ParentType extends ResolversParentTypes['APIKeyWithSecret'] = ResolversParentTypes['APIKeyWithSecret']> = ResolversObject<{
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  secret?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<Maybe<ResolversTypes['Date']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type CatalogResolvers<ContextType = any, ParentType extends ResolversParentTypes['Catalog'] = ResolversParentTypes['Catalog']> = ResolversObject<{
  identifier?: Resolver<ResolversTypes['CatalogIdentifier'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  website?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  isPublic?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  userPermissions?: Resolver<Maybe<Array<ResolversTypes['UserCatalog']>>, ParentType, ContextType>;
  packages?: Resolver<Array<Maybe<ResolversTypes['Package']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type CatalogIdentifierResolvers<ContextType = any, ParentType extends ResolversParentTypes['CatalogIdentifier'] = ResolversParentTypes['CatalogIdentifier']> = ResolversObject<{
  registryHostname?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  registryPort?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  catalogSlug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type CollectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Collection'] = ResolversParentTypes['Collection']> = ResolversObject<{
  identifier?: Resolver<ResolversTypes['CollectionIdentifier'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  packages?: Resolver<Maybe<Array<ResolversTypes['Package']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type CollectionIdentifierResolvers<ContextType = any, ParentType extends ResolversParentTypes['CollectionIdentifier'] = ResolversParentTypes['CollectionIdentifier']> = ResolversObject<{
  registryHostname?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  registryPort?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  collectionSlug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export interface LongScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Long'], any> {
  name: 'Long';
}

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  createMe?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationCreateMeArgs, 'value'>>;
  updateMe?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationUpdateMeArgs, 'value'>>;
  disableMe?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  createAPIKey?: Resolver<ResolversTypes['APIKeyWithSecret'], ParentType, ContextType>;
  deleteAPIKey?: Resolver<Maybe<ResolversTypes['APIKey']>, ParentType, ContextType, RequireFields<MutationDeleteApiKeyArgs, 'key'>>;
  removeUserFromCatalog?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<MutationRemoveUserFromCatalogArgs, 'username' | 'catalogSlug'>>;
  createCatalog?: Resolver<ResolversTypes['Catalog'], ParentType, ContextType, RequireFields<MutationCreateCatalogArgs, 'value'>>;
  updateCatalog?: Resolver<ResolversTypes['Catalog'], ParentType, ContextType, RequireFields<MutationUpdateCatalogArgs, 'identifier' | 'value'>>;
  disableCatalog?: Resolver<ResolversTypes['Catalog'], ParentType, ContextType, RequireFields<MutationDisableCatalogArgs, 'identifier'>>;
  createPackage?: Resolver<ResolversTypes['Package'], ParentType, ContextType, RequireFields<MutationCreatePackageArgs, 'value'>>;
  updatePackage?: Resolver<ResolversTypes['Package'], ParentType, ContextType, RequireFields<MutationUpdatePackageArgs, 'identifier' | 'value'>>;
  disablePackage?: Resolver<ResolversTypes['Package'], ParentType, ContextType, RequireFields<MutationDisablePackageArgs, 'identifier'>>;
  setPackagePermissions?: Resolver<ResolversTypes['UserPackagePermissions'], ParentType, ContextType, RequireFields<MutationSetPackagePermissionsArgs, 'identifier' | 'value'>>;
  removePackagePermissions?: Resolver<Maybe<ResolversTypes['Void']>, ParentType, ContextType, RequireFields<MutationRemovePackagePermissionsArgs, 'identifier' | 'username'>>;
  createVersion?: Resolver<ResolversTypes['Version'], ParentType, ContextType, RequireFields<MutationCreateVersionArgs, 'identifier' | 'value'>>;
  disableVersion?: Resolver<ResolversTypes['Void'], ParentType, ContextType, RequireFields<MutationDisableVersionArgs, 'identifier'>>;
  mixpanelTrack?: Resolver<ResolversTypes['Int'], ParentType, ContextType, RequireFields<MutationMixpanelTrackArgs, 'actions'>>;
  mixpanelEngage?: Resolver<ResolversTypes['Int'], ParentType, ContextType, RequireFields<MutationMixpanelEngageArgs, 'userInfo'>>;
}>;

export type MyCatalogResolvers<ContextType = any, ParentType extends ResolversParentTypes['MyCatalog'] = ResolversParentTypes['MyCatalog']> = ResolversObject<{
  catalog?: Resolver<ResolversTypes['Catalog'], ParentType, ContextType>;
  permission?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export interface ObjectScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Object'], any> {
  name: 'Object';
}

export type PackageResolvers<ContextType = any, ParentType extends ResolversParentTypes['Package'] = ResolversParentTypes['Package']> = ResolversObject<{
  identifier?: Resolver<ResolversTypes['PackageIdentifier'], ParentType, ContextType>;
  catalog?: Resolver<ResolversTypes['Catalog'], ParentType, ContextType>;
  displayName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  description?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  latestVersion?: Resolver<Maybe<ResolversTypes['Version']>, ParentType, ContextType>;
  versions?: Resolver<Array<Maybe<ResolversTypes['Version']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export interface PackageFileJsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['PackageFileJSON'], any> {
  name: 'PackageFileJSON';
}

export type PackageIdentifierResolvers<ContextType = any, ParentType extends ResolversParentTypes['PackageIdentifier'] = ResolversParentTypes['PackageIdentifier']> = ResolversObject<{
  registryHostname?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  registryPort?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  catalogSlug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  packageSlug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  me?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  search?: Resolver<Maybe<ResolversTypes['SearchResponse']>, ParentType, ContextType, RequireFields<QuerySearchArgs, 'search'>>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<QueryUserArgs, 'username'>>;
  myCatalogs?: Resolver<Array<Maybe<ResolversTypes['Catalog']>>, ParentType, ContextType>;
  usersByCatalog?: Resolver<Array<Maybe<ResolversTypes['User']>>, ParentType, ContextType, RequireFields<QueryUsersByCatalogArgs, 'identifier'>>;
  catalog?: Resolver<Maybe<ResolversTypes['Catalog']>, ParentType, ContextType, RequireFields<QueryCatalogArgs, 'identifier'>>;
  package?: Resolver<Maybe<ResolversTypes['Package']>, ParentType, ContextType, RequireFields<QueryPackageArgs, 'identifier'>>;
  collections?: Resolver<Maybe<Array<ResolversTypes['Collection']>>, ParentType, ContextType>;
}>;

export type SearchResponseResolvers<ContextType = any, ParentType extends ResolversParentTypes['SearchResponse'] = ResolversParentTypes['SearchResponse']> = ResolversObject<{
  catalogs?: Resolver<Maybe<Array<Maybe<ResolversTypes['Catalog']>>>, ParentType, ContextType>;
  packages?: Resolver<Maybe<Array<Maybe<ResolversTypes['Package']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  firstName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  lastName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  location?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  twitterHandle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  website?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  emailAddress?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  gitHubHandle?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nameIsPublic?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type UserCatalogResolvers<ContextType = any, ParentType extends ResolversParentTypes['UserCatalog'] = ResolversParentTypes['UserCatalog']> = ResolversObject<{
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  catalog?: Resolver<ResolversTypes['Catalog'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type UserPackageResolvers<ContextType = any, ParentType extends ResolversParentTypes['UserPackage'] = ResolversParentTypes['UserPackage']> = ResolversObject<{
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  package?: Resolver<ResolversTypes['Package'], ParentType, ContextType>;
  permissions?: Resolver<Maybe<Array<ResolversTypes['Permission']>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type UserPackagePermissionsResolvers<ContextType = any, ParentType extends ResolversParentTypes['UserPackagePermissions'] = ResolversParentTypes['UserPackagePermissions']> = ResolversObject<{
  package?: Resolver<ResolversTypes['Package'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  permissions?: Resolver<Array<ResolversTypes['Permission']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type VersionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Version'] = ResolversParentTypes['Version']> = ResolversObject<{
  identifier?: Resolver<ResolversTypes['VersionIdentifier'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  package?: Resolver<ResolversTypes['Package'], ParentType, ContextType>;
  packageFile?: Resolver<Maybe<ResolversTypes['PackageFileJSON']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export type VersionIdentifierResolvers<ContextType = any, ParentType extends ResolversParentTypes['VersionIdentifier'] = ResolversParentTypes['VersionIdentifier']> = ResolversObject<{
  registryHostname?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  registryPort?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  catalogSlug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  packageSlug?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  versionMajor?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  versionMinor?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  versionPatch?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType>;
}>;

export interface VoidScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Void'], any> {
  name: 'Void';
}

export type Resolvers<ContextType = any> = ResolversObject<{
  APIKey?: ApiKeyResolvers<ContextType>;
  APIKeyWithSecret?: ApiKeyWithSecretResolvers<ContextType>;
  Catalog?: CatalogResolvers<ContextType>;
  CatalogIdentifier?: CatalogIdentifierResolvers<ContextType>;
  Collection?: CollectionResolvers<ContextType>;
  CollectionIdentifier?: CollectionIdentifierResolvers<ContextType>;
  Date?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  Long?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  MyCatalog?: MyCatalogResolvers<ContextType>;
  Object?: GraphQLScalarType;
  Package?: PackageResolvers<ContextType>;
  PackageFileJSON?: GraphQLScalarType;
  PackageIdentifier?: PackageIdentifierResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  SearchResponse?: SearchResponseResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserCatalog?: UserCatalogResolvers<ContextType>;
  UserPackage?: UserPackageResolvers<ContextType>;
  UserPackagePermissions?: UserPackagePermissionsResolvers<ContextType>;
  Version?: VersionResolvers<ContextType>;
  VersionIdentifier?: VersionIdentifierResolvers<ContextType>;
  Void?: GraphQLScalarType;
}>;


/**
 * @deprecated
 * Use "Resolvers" root object instead. If you wish to get "IResolvers", add "typesPrefix: I" to your config.
 */
export type IResolvers<ContextType = any> = Resolvers<ContextType>;
export type DirectiveResolvers<ContextType = any> = ResolversObject<{
  isAuthenticated?: IsAuthenticatedDirectiveResolver<any, any, ContextType>;
  hasCatalogPermission?: HasCatalogPermissionDirectiveResolver<any, any, ContextType>;
  hasPackagePermission?: HasPackagePermissionDirectiveResolver<any, any, ContextType>;
  isSiteAdmin?: IsSiteAdminDirectiveResolver<any, any, ContextType>;
  isUserOrAdmin?: IsUserOrAdminDirectiveResolver<any, any, ContextType>;
}>;


/**
 * @deprecated
 * Use "DirectiveResolvers" root object instead. If you wish to get "IDirectiveResolvers", add "typesPrefix: I" to your config.
 */
export type IDirectiveResolvers<ContextType = any> = DirectiveResolvers<ContextType>;