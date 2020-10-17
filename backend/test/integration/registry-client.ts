import { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
	ID: string;
	String: string;
	Boolean: boolean;
	Int: number;
	Float: number;
	Date: Date;
	JSON: { [key: string]: any };
	PackageFileJSON: any;
	Void: any;
	Long: any;
	Object: any;
	ValidationString: any;
};

/**  Represents the API Key, not including the secret. API Keys are secrets that are used provided as authorization by the registry clients. */
export type APIKey = {
	__typename?: "APIKey";
	label: Scalars["String"];
	id: Scalars["String"];
	createdAt?: Maybe<Scalars["Date"]>;
	lastUsed?: Maybe<Scalars["Date"]>;
	scopes: Array<Scope>;
};

/**  This response is only sent when creating a new API key, so that the secret is shared only once  */
export type APIKeyWithSecret = {
	__typename?: "APIKeyWithSecret";
	label: Scalars["String"];
	id: Scalars["String"];
	secret: Scalars["String"];
	createdAt?: Maybe<Scalars["Date"]>;
	scopes: Array<Scope>;
};

/**  The information necessary to create an API Key  */
export type CreateAPIKeyInput = {
	label: Scalars["String"];
	scopes: Array<Scope>;
};

export enum AUTHENTICATION_ERROR {
	USER_NOT_FOUND = "USER_NOT_FOUND",
	WRONG_CREDENTIALS = "WRONG_CREDENTIALS"
}

export enum INVALID_USERNAME_ERROR {
	USERNAME_REQUIRED = "USERNAME_REQUIRED",
	USERNAME_TOO_SHORT = "USERNAME_TOO_SHORT",
	USERNAME_TOO_LONG = "USERNAME_TOO_LONG",
	INVALID_CHARACTERS = "INVALID_CHARACTERS"
}

export enum INVALID_PASSWORD_ERROR {
	PASSWORD_REQUIRED = "PASSWORD_REQUIRED",
	PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT",
	PASSWORD_TOO_LONG = "PASSWORD_TOO_LONG",
	INVALID_CHARACTERS = "INVALID_CHARACTERS"
}

/** Potential responses when creating a new version on a package */
export enum VersionConflict {
	VERSION_EXISTS = "VERSION_EXISTS",
	HIGHER_VERSION_EXISTS = "HIGHER_VERSION_EXISTS",
	HIGHER_VERSION_REQUIRED = "HIGHER_VERSION_REQUIRED"
}

/** General permission values, which are applied to users for catalogs, package, and other access */
export enum Permission {
	MANAGE = "MANAGE",
	CREATE = "CREATE",
	VIEW = "VIEW",
	EDIT = "EDIT",
	DELETE = "DELETE",
	NONE = "NONE"
}

/** Scopes for an API Key */
export enum Scope {
	MANAGE_API_KEYS = "MANAGE_API_KEYS",
	READ_PRIVATE_ASSETS = "READ_PRIVATE_ASSETS",
	MANAGE_PRIVATE_ASSETS = "MANAGE_PRIVATE_ASSETS"
}

/** A collection of packages offered by a person or an organization. */
export type Catalog = {
	__typename?: "Catalog";
	identifier: CatalogIdentifier;
	displayName: Scalars["String"];
	description?: Maybe<Scalars["String"]>;
	website?: Maybe<Scalars["String"]>;
	isPublic: Scalars["Boolean"];
	userPermissions?: Maybe<Array<UserCatalog>>;
	packages?: Maybe<Array<Maybe<Package>>>;
};

/**
 *  Represents a single offering on the registry. Packages contain one or more versions of a Package File as it is updated over time. A package may contain one or more
 * data data sets, and is a member of one and only one catalog. A package may be included in zero or more collections.
 */
export type Package = {
	__typename?: "Package";
	creator: User;
	identifier: PackageIdentifier;
	catalog: Catalog;
	displayName: Scalars["String"];
	description?: Maybe<Scalars["String"]>;
	latestVersion?: Maybe<Version>;
	versions: Array<Maybe<Version>>;
	createdAt: Scalars["Date"];
	updatedAt: Scalars["Date"];
};

/** Represents a user, and their permission to a catalog */
export type UserCatalog = {
	__typename?: "UserCatalog";
	user: User;
	catalog: Catalog;
	permissions?: Maybe<Array<Permission>>;
};

/**
 *  A collection is a curated list of one or more packages from across one or more catalogs on a given topic. Collections are created and maintained
 * by consumer side users, and generally not the publishers
 */
export type Collection = {
	__typename?: "Collection";
	creator: User;
	identifier: CollectionIdentifier;
	name: Scalars["String"];
	description?: Maybe<Scalars["String"]>;
	packages?: Maybe<Array<Package>>;
	createdAt: Scalars["Date"];
	updatedAt: Scalars["Date"];
};

/** Represents a single package's listing in a collection, and information about how it was added */
export type CollectionPackage = {
	__typename?: "CollectionPackage";
	collection: Collection;
	package: Package;
	addedByUser?: Maybe<User>;
};

/** Represents a user, and their permissions on a package */
export type UserPackagePermissions = {
	__typename?: "UserPackagePermissions";
	package: Package;
	username: Scalars["String"];
	permissions: Array<Permission>;
};

/** A single version of a package file for a package listing on the registry */
export type Version = {
	__typename?: "Version";
	identifier: VersionIdentifier;
	createdAt: Scalars["Date"];
	updatedAt: Scalars["Date"];
	package: Package;
	author?: Maybe<User>;
	packageFile?: Maybe<Scalars["PackageFileJSON"]>;
};

/** The complete identifier for a version of a package on a registry */
export type VersionIdentifier = {
	__typename?: "VersionIdentifier";
	registryHostname: Scalars["String"];
	registryPort: Scalars["Int"];
	catalogSlug: Scalars["String"];
	packageSlug: Scalars["String"];
	versionMajor: Scalars["Int"];
	versionMinor: Scalars["Int"];
	versionPatch: Scalars["Int"];
};

/** The complete identifier for a package on a registry */
export type PackageIdentifier = {
	__typename?: "PackageIdentifier";
	registryHostname: Scalars["String"];
	registryPort: Scalars["Int"];
	catalogSlug: Scalars["String"];
	packageSlug: Scalars["String"];
};

/** The complete identifier for a catalog on a registry */
export type CatalogIdentifier = {
	__typename?: "CatalogIdentifier";
	registryHostname: Scalars["String"];
	registryPort: Scalars["Int"];
	catalogSlug: Scalars["String"];
};

/** The complete identifier for a collections on a registry */
export type CollectionIdentifier = {
	__typename?: "CollectionIdentifier";
	registryHostname: Scalars["String"];
	registryPort: Scalars["Int"];
	collectionSlug: Scalars["String"];
};

/** The response for a catalog search request */
export type SearchCatalogsResult = {
	__typename?: "SearchCatalogsResult";
	catalogs?: Maybe<Array<Catalog>>;
	hasMore: Scalars["Boolean"];
	count: Scalars["Int"];
};

/** " The response for a collection search request */
export type SearchCollectionResult = {
	__typename?: "SearchCollectionResult";
	collections?: Maybe<Array<Collection>>;
	hasMore: Scalars["Boolean"];
	count: Scalars["Int"];
};

/** The response for a package search request */
export type SearchPackagesResult = {
	__typename?: "SearchPackagesResult";
	packages?: Maybe<Array<Package>>;
	hasMore: Scalars["Boolean"];
	count: Scalars["Int"];
};

/** The response for latest packages request */
export type LatestPackagesResult = {
	__typename?: "LatestPackagesResult";
	packages?: Maybe<Array<Package>>;
	hasMore: Scalars["Boolean"];
	count: Scalars["Int"];
};

/** The response for a search term auto-complete request */
export type AutoCompleteResult = {
	__typename?: "AutoCompleteResult";
	catalogs?: Maybe<Array<Catalog>>;
	packages?: Maybe<Array<Package>>;
};

/** The complete identifier for a version of a package, assuming the registry is based on the HTTP request URL */
export type VersionIdentifierInput = {
	catalogSlug: Scalars["String"];
	packageSlug: Scalars["String"];
	versionMajor: Scalars["Int"];
	versionMinor: Scalars["Int"];
	versionPatch: Scalars["Int"];
};

/** The complete identifier for a package, assuming the registry is based on the HTTP request URL */
export type PackageIdentifierInput = {
	catalogSlug: Scalars["String"];
	packageSlug: Scalars["String"];
};

/** The complete identifier for a catalog assuming the registry is based on the HTTP request URL */
export type CatalogIdentifierInput = {
	catalogSlug: Scalars["String"];
};

/** The complete identifier for a collection assuming the registry is based on the HTTP request URL */
export type CollectionIdentifierInput = {
	collectionSlug: Scalars["String"];
};

/** The properties for creating a catalog */
export type CreateCatalogInput = {
	slug: Scalars["String"];
	displayName: Scalars["String"];
	description?: Maybe<Scalars["String"]>;
	website?: Maybe<Scalars["String"]>;
	isPublic: Scalars["Boolean"];
};

/** The properties of a catalog that can be updated. All are optional. Only the ones specified are applied. */
export type UpdateCatalogInput = {
	newSlug?: Maybe<Scalars["String"]>;
	displayName?: Maybe<Scalars["String"]>;
	description?: Maybe<Scalars["String"]>;
};

/** The properties for creating a package list. */
export type CreatePackageInput = {
	packageSlug: Scalars["String"];
	catalogSlug: Scalars["String"];
	displayName: Scalars["String"];
	description?: Maybe<Scalars["String"]>;
};

/** The properties for updating an existing package. All are optional. Only the ones specified are applied. */
export type UpdatePackageInput = {
	newCatalogSlug?: Maybe<Scalars["String"]>;
	newPackageSlug?: Maybe<Scalars["String"]>;
	displayName?: Maybe<Scalars["String"]>;
	description?: Maybe<Scalars["String"]>;
	isPublic?: Maybe<Scalars["Boolean"]>;
};

/** The properties for updating a specific user's permissions on a package */
export type SetPackagePermissionInput = {
	username: Scalars["String"];
	permissions: Array<Permission>;
};

/** To create a new package version, submit a valid package file */
export type CreateVersionInput = {
	packageFile?: Maybe<Scalars["PackageFileJSON"]>;
};

/** For creating a new collection on the registry. */
export type CreateCollectionInput = {
	collectionSlug: Scalars["String"];
	name: Scalars["String"];
	description?: Maybe<Scalars["String"]>;
};

/** For updating an existing collection. All properties are optional, and only the ones specified are applied */
export type UpdateCollectionInput = {
	collectionSlug?: Maybe<Scalars["String"]>;
	name?: Maybe<Scalars["String"]>;
	description?: Maybe<Scalars["String"]>;
	isPublic?: Maybe<Scalars["Boolean"]>;
};

export type Query = {
	__typename?: "Query";
	/** Whether the specified username is available for sign up */
	usernameAvailable: Scalars["Boolean"];
	/** Whether the specified email address is avialable for sign up */
	emailAddressAvailable: Scalars["Boolean"];
	/** Who am i */
	me: User;
	/** A list of the requesting user's exisiting API key information */
	myAPIKeys?: Maybe<Array<APIKey>>;
	/** Returns all of the users for a given catalog */
	usersByCatalog: Array<Maybe<User>>;
	/** Return a user by a given username, and returns only the properties on that user the requester should be able to view */
	user: User;
	/** Returns package and collections with slugs that start with the given parameter */
	autoComplete: AutoCompleteResult;
	/** For testing whether a given catalog slug is available to be reserved */
	catalogSlugAvailable: Scalars["Boolean"];
	/** Returns the catalogs the requesting user either owns or has edit or manage permission to */
	myCatalogs: Array<Maybe<Catalog>>;
	/** Returns catalogs matching the query string (which can include boolean logic combinations) with pagination */
	searchCatalogs: SearchCatalogsResult;
	/** Returns the catalog of the given identifier. Requires permission to view the catalog */
	catalog?: Maybe<Catalog>;
	/** Returns the package for the given identifier. Requires permission to view the package */
	package?: Maybe<Package>;
	/** Returns packages that match the given search query (which can contain boolean search logic). This request is paginated. */
	searchPackages: SearchPackagesResult;
	/** Returns the latest packages */
	latestPackages: LatestPackagesResult;
	/** Returns the collection specified only if the user has permission to view it */
	collection?: Maybe<Collection>;
	/** Returns all of the collections the user has permission to view */
	collections?: Maybe<Array<Collection>>;
	/** Returns collections whos names match the given query. This request is paginated */
	searchCollections: SearchCollectionResult;
};

export type QueryusernameAvailableArgs = {
	username: Scalars["String"];
};

export type QueryemailAddressAvailableArgs = {
	emailAddress: Scalars["String"];
};

export type QueryusersByCatalogArgs = {
	identifier: CatalogIdentifierInput;
};

export type QueryuserArgs = {
	username: Scalars["String"];
};

export type QueryautoCompleteArgs = {
	startsWith: Scalars["String"];
};

export type QuerycatalogSlugAvailableArgs = {
	catalogSlug: Scalars["String"];
};

export type QuerysearchCatalogsArgs = {
	query: Scalars["String"];
	offSet: Scalars["Int"];
	limit: Scalars["Int"];
};

export type QuerycatalogArgs = {
	identifier: CatalogIdentifierInput;
};

export type QuerypackageArgs = {
	identifier: PackageIdentifierInput;
};

export type QuerysearchPackagesArgs = {
	query: Scalars["String"];
	offSet: Scalars["Int"];
	limit: Scalars["Int"];
};

export type QuerylatestPackagesArgs = {
	offSet: Scalars["Int"];
	limit: Scalars["Int"];
};

export type QuerycollectionArgs = {
	identifier: CollectionIdentifierInput;
};

export type QuerysearchCollectionsArgs = {
	query: Scalars["String"];
	offset: Scalars["Int"];
	limit: Scalars["Int"];
};

export type Mutation = {
	__typename?: "Mutation";
	/** Creates a new user with the given input. Returns the user's authorization token. */
	createMe: Scalars["String"];
	/** Updates the requesting user's information. All fields optional. */
	updateMe: User;
	/** Disables the requesting user's account */
	disableMe: User;
	/** Using a username or email address and a password, requests authentication information for the given user */
	login: Scalars["String"];
	/** Destorys the current user's session. */
	logout?: Maybe<Scalars["Void"]>;
	/** Generates a new API Key for the requesting user */
	createAPIKey: APIKeyWithSecret;
	/** Deletes an existing API Key for the requesting user */
	deleteAPIKey?: Maybe<APIKey>;
	/** Removes a specified user from the specified catalog, and all of their permissions */
	removeUserFromCatalog: User;
	/** Creates a new catalog which is owned by the requesting user */
	createCatalog: Catalog;
	/** Updates an existing catalog. */
	updateCatalog: Catalog;
	/** Disables and existing catalog. All packages in the catalog are then disabled */
	disableCatalog: Catalog;
	/** Creates a new package based on the information provided, and gives the requesting user all permissions to the package */
	createPackage: Package;
	/** Updates an existing package's descriptive information. See createVersion for how to update the package data definitions */
	updatePackage: Package;
	/** Disables an existing package */
	disablePackage: Package;
	/** Creates a new collection, which is managed by the requesting user */
	createCollection: Collection;
	/** Updates an existing collection */
	updateCollection: Collection;
	/** Disables an existing collection. */
	disableCollection: Collection;
	/** Includes an existing package in an existing collection */
	addPackageToCollection: CollectionPackage;
	/** Removes an existing package from a collection */
	removePackageFromCollection?: Maybe<Scalars["Void"]>;
	/** Sets the permissions for a given user */
	setPackagePermissions: UserPackagePermissions;
	/** Removes all permissions for a user on a given package. Requires the manage package permission */
	removePackagePermissions?: Maybe<Scalars["Void"]>;
	/** Creates a new version of the package file on a package listing. There is no update, as any update should also be published as a new version */
	createVersion: Version;
	/** Disables a given version from a package. Use this sparingly, to allow for a viewable history of change for the package */
	disableVersion: Scalars["Void"];
	/** For proxying user activity tracking outside of other API requests */
	track: Scalars["Int"];
};

export type MutationcreateMeArgs = {
	value: CreateUserInput;
};

export type MutationupdateMeArgs = {
	value: UpdateUserInput;
};

export type MutationloginArgs = {
	username: Scalars["String"];
	password: Scalars["String"];
};

export type MutationcreateAPIKeyArgs = {
	value: CreateAPIKeyInput;
};

export type MutationdeleteAPIKeyArgs = {
	id: Scalars["String"];
};

export type MutationremoveUserFromCatalogArgs = {
	username: Scalars["String"];
	catalogSlug: Scalars["String"];
};

export type MutationcreateCatalogArgs = {
	value: CreateCatalogInput;
};

export type MutationupdateCatalogArgs = {
	identifier: CatalogIdentifierInput;
	value: UpdateCatalogInput;
};

export type MutationdisableCatalogArgs = {
	identifier: CatalogIdentifierInput;
};

export type MutationcreatePackageArgs = {
	value: CreatePackageInput;
};

export type MutationupdatePackageArgs = {
	identifier: PackageIdentifierInput;
	value: UpdatePackageInput;
};

export type MutationdisablePackageArgs = {
	identifier: PackageIdentifierInput;
};

export type MutationcreateCollectionArgs = {
	value: CreateCollectionInput;
};

export type MutationupdateCollectionArgs = {
	identifier: CollectionIdentifierInput;
	value: UpdateCollectionInput;
};

export type MutationdisableCollectionArgs = {
	identifier: CollectionIdentifierInput;
};

export type MutationaddPackageToCollectionArgs = {
	collectionIdentifier: CollectionIdentifierInput;
	packageIdentifier: PackageIdentifierInput;
};

export type MutationremovePackageFromCollectionArgs = {
	collectionIdentifier: CollectionIdentifierInput;
	packageIdentifier: PackageIdentifierInput;
};

export type MutationsetPackagePermissionsArgs = {
	identifier: PackageIdentifierInput;
	value: SetPackagePermissionInput;
};

export type MutationremovePackagePermissionsArgs = {
	identifier: PackageIdentifierInput;
	username: Scalars["String"];
};

export type MutationcreateVersionArgs = {
	identifier: PackageIdentifierInput;
	value: CreateVersionInput;
};

export type MutationdisableVersionArgs = {
	identifier: VersionIdentifierInput;
};

export type MutationtrackArgs = {
	actions: Scalars["JSON"];
};

/** Represents one real world person, and their information */
export type User = {
	__typename?: "User";
	username: Scalars["String"];
	firstName?: Maybe<Scalars["String"]>;
	lastName?: Maybe<Scalars["String"]>;
	location?: Maybe<Scalars["String"]>;
	twitterHandle?: Maybe<Scalars["String"]>;
	website?: Maybe<Scalars["String"]>;
	emailAddress?: Maybe<Scalars["String"]>;
	gitHubHandle?: Maybe<Scalars["String"]>;
	nameIsPublic: Scalars["Boolean"];
};

/** For creating an new user for other people as an administrator */
export type CreateUserInputAdmin = {
	firstName?: Maybe<Scalars["String"]>;
	lastName?: Maybe<Scalars["String"]>;
	emailAddress: Scalars["String"];
	username: Scalars["String"];
	isAdmin: Scalars["Boolean"];
};

/** For self service new user sign up */
export type CreateUserInput = {
	firstName?: Maybe<Scalars["String"]>;
	lastName?: Maybe<Scalars["String"]>;
	emailAddress: Scalars["String"];
	username: Scalars["String"];
	password: Scalars["String"];
};

/** For updating a user, or your own user. All values are optional, and only those specified are applied. */
export type UpdateUserInput = {
	username?: Maybe<Scalars["String"]>;
	firstName?: Maybe<Scalars["String"]>;
	lastName?: Maybe<Scalars["String"]>;
	email?: Maybe<Scalars["String"]>;
	password?: Maybe<Scalars["String"]>;
	nameIsPublic?: Maybe<Scalars["Boolean"]>;
	location?: Maybe<Scalars["String"]>;
	twitterHandle?: Maybe<Scalars["String"]>;
	gitHubHandle?: Maybe<Scalars["String"]>;
	website?: Maybe<Scalars["String"]>;
};

export type AutoCompleteQueryVariables = Exact<{
	startsWith: Scalars["String"];
}>;

export type AutoCompleteQuery = { __typename?: "Query" } & {
	autoComplete: { __typename?: "AutoCompleteResult" } & {
		catalogs?: Maybe<
			Array<
				{ __typename?: "Catalog" } & Pick<Catalog, "displayName"> & {
						identifier: { __typename?: "CatalogIdentifier" } & Pick<CatalogIdentifier, "catalogSlug">;
					}
			>
		>;
		packages?: Maybe<
			Array<
				{ __typename?: "Package" } & Pick<Package, "displayName"> & {
						identifier: { __typename?: "PackageIdentifier" } & Pick<
							PackageIdentifier,
							"catalogSlug" | "packageSlug"
						>;
					}
			>
		>;
	};
};

export type GetCatalogQueryVariables = Exact<{
	identifier: CatalogIdentifierInput;
}>;

export type GetCatalogQuery = { __typename?: "Query" } & {
	catalog?: Maybe<
		{ __typename?: "Catalog" } & Pick<Catalog, "displayName" | "description" | "website"> & {
				identifier: { __typename?: "CatalogIdentifier" } & Pick<CatalogIdentifier, "catalogSlug">;
				packages?: Maybe<
					Array<
						Maybe<
							{ __typename?: "Package" } & Pick<Package, "displayName" | "description"> & {
									identifier: { __typename?: "PackageIdentifier" } & Pick<
										PackageIdentifier,
										"catalogSlug" | "packageSlug"
									>;
									latestVersion?: Maybe<
										{ __typename?: "Version" } & Pick<
											Version,
											"createdAt" | "updatedAt" | "packageFile"
										> & {
												identifier: { __typename?: "VersionIdentifier" } & Pick<
													VersionIdentifier,
													| "catalogSlug"
													| "packageSlug"
													| "versionMajor"
													| "versionMinor"
													| "versionPatch"
												>;
											}
									>;
								}
						>
					>
				>;
			}
	>;
};

export type CreateAPIKeyMutationVariables = Exact<{
	value: CreateAPIKeyInput;
}>;

export type CreateAPIKeyMutation = { __typename?: "Mutation" } & {
	createAPIKey: { __typename?: "APIKeyWithSecret" } & Pick<APIKeyWithSecret, "secret" | "label" | "scopes" | "id">;
};

export type CreateMeMutationVariables = Exact<{
	value: CreateUserInput;
}>;

export type CreateMeMutation = { __typename?: "Mutation" } & Pick<Mutation, "createMe">;

export type DeleteAPIKeyMutationVariables = Exact<{
	id: Scalars["String"];
}>;

export type DeleteAPIKeyMutation = { __typename?: "Mutation" } & {
	deleteAPIKey?: Maybe<{ __typename?: "APIKey" } & Pick<APIKey, "label" | "scopes" | "id">>;
};

export type EmailAddressAvailableQueryVariables = Exact<{
	emailAddress: Scalars["String"];
}>;

export type EmailAddressAvailableQuery = { __typename?: "Query" } & Pick<Query, "emailAddressAvailable">;

export type GetLatestPackagesQueryVariables = Exact<{
	offset: Scalars["Int"];
	limit: Scalars["Int"];
}>;

export type GetLatestPackagesQuery = { __typename?: "Query" } & {
	latestPackages: { __typename?: "LatestPackagesResult" } & {
		packages?: Maybe<
			Array<
				{ __typename?: "Package" } & Pick<Package, "displayName" | "description"> & {
						identifier: { __typename?: "PackageIdentifier" } & Pick<
							PackageIdentifier,
							"catalogSlug" | "packageSlug"
						>;
						latestVersion?: Maybe<
							{ __typename?: "Version" } & Pick<Version, "createdAt" | "updatedAt"> & {
									identifier: { __typename?: "VersionIdentifier" } & Pick<
										VersionIdentifier,
										"versionMajor" | "versionMinor" | "versionPatch"
									>;
									author?: Maybe<{ __typename?: "User" } & Pick<User, "username">>;
								}
						>;
					}
			>
		>;
	};
};

export type LoginMutationVariables = Exact<{
	username: Scalars["String"];
	password: Scalars["String"];
}>;

export type LoginMutation = { __typename?: "Mutation" } & Pick<Mutation, "login">;

export type LogoutMutationVariables = Exact<{
	username: Scalars["String"];
	password: Scalars["String"];
}>;

export type LogoutMutation = { __typename?: "Mutation" } & Pick<Mutation, "logout">;

export type MeQueryVariables = Exact<{ [key: string]: never }>;

export type MeQuery = { __typename?: "Query" } & {
	me: { __typename?: "User" } & Pick<
		User,
		| "emailAddress"
		| "firstName"
		| "lastName"
		| "username"
		| "nameIsPublic"
		| "location"
		| "twitterHandle"
		| "gitHubHandle"
		| "website"
	>;
};

export type MyAPIKeysQueryVariables = Exact<{ [key: string]: never }>;

export type MyAPIKeysQuery = { __typename?: "Query" } & {
	myAPIKeys?: Maybe<Array<{ __typename?: "APIKey" } & Pick<APIKey, "id" | "label" | "scopes">>>;
};

export type MyCatalogsQueryVariables = Exact<{ [key: string]: never }>;

export type MyCatalogsQuery = { __typename?: "Query" } & {
	myCatalogs: Array<
		Maybe<
			{ __typename?: "Catalog" } & Pick<Catalog, "displayName" | "description" | "website" | "isPublic"> & {
					identifier: { __typename?: "CatalogIdentifier" } & Pick<
						CatalogIdentifier,
						"registryHostname" | "registryPort" | "catalogSlug"
					>;
				}
		>
	>;
};

export type PackageQueryVariables = Exact<{
	identifier: PackageIdentifierInput;
}>;

export type PackageQuery = { __typename?: "Query" } & {
	package?: Maybe<
		{ __typename?: "Package" } & Pick<Package, "displayName" | "description"> & {
				identifier: { __typename?: "PackageIdentifier" } & Pick<
					PackageIdentifier,
					"catalogSlug" | "packageSlug"
				>;
				catalog: { __typename?: "Catalog" } & Pick<Catalog, "displayName">;
				latestVersion?: Maybe<
					{ __typename?: "Version" } & Pick<Version, "packageFile"> & {
							identifier: { __typename?: "VersionIdentifier" } & Pick<
								VersionIdentifier,
								"versionMajor" | "versionMinor" | "versionPatch"
							>;
						}
				>;
			}
	>;
};

export type SearchCatalogsQueryVariables = Exact<{
	query: Scalars["String"];
	limit: Scalars["Int"];
	offset: Scalars["Int"];
}>;

export type SearchCatalogsQuery = { __typename?: "Query" } & {
	searchCatalogs: { __typename?: "SearchCatalogsResult" } & {
		catalogs?: Maybe<
			Array<
				{ __typename?: "Catalog" } & Pick<Catalog, "displayName" | "description"> & {
						identifier: { __typename?: "CatalogIdentifier" } & Pick<CatalogIdentifier, "catalogSlug">;
					}
			>
		>;
	};
};

export type SearchPackagesQueryVariables = Exact<{
	query: Scalars["String"];
	limit: Scalars["Int"];
	offset: Scalars["Int"];
}>;

export type SearchPackagesQuery = { __typename?: "Query" } & {
	searchPackages: { __typename?: "SearchPackagesResult" } & {
		packages?: Maybe<
			Array<
				{ __typename?: "Package" } & Pick<Package, "displayName" | "description"> & {
						identifier: { __typename?: "PackageIdentifier" } & Pick<
							PackageIdentifier,
							"catalogSlug" | "packageSlug"
						>;
						latestVersion?: Maybe<
							{ __typename?: "Version" } & {
								identifier: { __typename?: "VersionIdentifier" } & Pick<
									VersionIdentifier,
									"versionMajor" | "versionMinor" | "versionPatch"
								>;
							}
						>;
					}
			>
		>;
	};
};

export type UpdateMeMutationVariables = Exact<{
	value: UpdateUserInput;
}>;

export type UpdateMeMutation = { __typename?: "Mutation" } & {
	updateMe: { __typename?: "User" } & Pick<
		User,
		| "emailAddress"
		| "firstName"
		| "lastName"
		| "username"
		| "nameIsPublic"
		| "location"
		| "twitterHandle"
		| "gitHubHandle"
		| "website"
	>;
};

export type UserQueryVariables = Exact<{
	username: Scalars["String"];
}>;

export type UserQuery = { __typename?: "Query" } & {
	user: { __typename?: "User" } & Pick<
		User,
		| "emailAddress"
		| "firstName"
		| "lastName"
		| "username"
		| "nameIsPublic"
		| "location"
		| "twitterHandle"
		| "gitHubHandle"
		| "website"
	>;
};

export type UsernameAvailableQueryVariables = Exact<{
	username: Scalars["String"];
}>;

export type UsernameAvailableQuery = { __typename?: "Query" } & Pick<Query, "usernameAvailable">;

export const AutoCompleteDocument: DocumentNode<AutoCompleteQuery, AutoCompleteQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "AutoComplete" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "startsWith" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "autoComplete" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "startsWith" },
								value: { kind: "Variable", name: { kind: "Name", value: "startsWith" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "catalogs" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "identifier" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "catalogSlug" },
															arguments: [],
															directives: []
														}
													]
												}
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "displayName" },
												arguments: [],
												directives: []
											}
										]
									}
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "packages" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "identifier" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "catalogSlug" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "packageSlug" },
															arguments: [],
															directives: []
														}
													]
												}
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "displayName" },
												arguments: [],
												directives: []
											}
										]
									}
								}
							]
						}
					}
				]
			}
		}
	]
};
export const GetCatalogDocument: DocumentNode<GetCatalogQuery, GetCatalogQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "GetCatalog" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "identifier" } },
					type: {
						kind: "NonNullType",
						type: { kind: "NamedType", name: { kind: "Name", value: "CatalogIdentifierInput" } }
					},
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "catalog" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "identifier" },
								value: { kind: "Variable", name: { kind: "Name", value: "identifier" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "identifier" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "catalogSlug" },
												arguments: [],
												directives: []
											}
										]
									}
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "displayName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "description" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "website" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "packages" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "identifier" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "catalogSlug" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "packageSlug" },
															arguments: [],
															directives: []
														}
													]
												}
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "displayName" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "description" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "latestVersion" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "identifier" },
															arguments: [],
															directives: [],
															selectionSet: {
																kind: "SelectionSet",
																selections: [
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "catalogSlug" },
																		arguments: [],
																		directives: []
																	},
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "packageSlug" },
																		arguments: [],
																		directives: []
																	},
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionMajor" },
																		arguments: [],
																		directives: []
																	},
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionMinor" },
																		arguments: [],
																		directives: []
																	},
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionPatch" },
																		arguments: [],
																		directives: []
																	}
																]
															}
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "createdAt" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "updatedAt" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "packageFile" },
															arguments: [],
															directives: []
														}
													]
												}
											}
										]
									}
								}
							]
						}
					}
				]
			}
		}
	]
};
export const CreateAPIKeyDocument: DocumentNode<CreateAPIKeyMutation, CreateAPIKeyMutationVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "mutation",
			name: { kind: "Name", value: "CreateAPIKey" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "value" } },
					type: {
						kind: "NonNullType",
						type: { kind: "NamedType", name: { kind: "Name", value: "CreateAPIKeyInput" } }
					},
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "createAPIKey" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "value" },
								value: { kind: "Variable", name: { kind: "Name", value: "value" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "secret" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "label" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "scopes" },
									arguments: [],
									directives: []
								},
								{ kind: "Field", name: { kind: "Name", value: "id" }, arguments: [], directives: [] }
							]
						}
					}
				]
			}
		}
	]
};
export const CreateMeDocument: DocumentNode<CreateMeMutation, CreateMeMutationVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "mutation",
			name: { kind: "Name", value: "CreateMe" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "value" } },
					type: {
						kind: "NonNullType",
						type: { kind: "NamedType", name: { kind: "Name", value: "CreateUserInput" } }
					},
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "createMe" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "value" },
								value: { kind: "Variable", name: { kind: "Name", value: "value" } }
							}
						],
						directives: []
					}
				]
			}
		}
	]
};
export const DeleteAPIKeyDocument: DocumentNode<DeleteAPIKeyMutation, DeleteAPIKeyMutationVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "mutation",
			name: { kind: "Name", value: "DeleteAPIKey" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "deleteAPIKey" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "id" },
								value: { kind: "Variable", name: { kind: "Name", value: "id" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "label" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "scopes" },
									arguments: [],
									directives: []
								},
								{ kind: "Field", name: { kind: "Name", value: "id" }, arguments: [], directives: [] }
							]
						}
					}
				]
			}
		}
	]
};
export const EmailAddressAvailableDocument: DocumentNode<
	EmailAddressAvailableQuery,
	EmailAddressAvailableQueryVariables
> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "EmailAddressAvailable" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "emailAddress" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "emailAddressAvailable" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "emailAddress" },
								value: { kind: "Variable", name: { kind: "Name", value: "emailAddress" } }
							}
						],
						directives: []
					}
				]
			}
		}
	]
};
export const GetLatestPackagesDocument: DocumentNode<GetLatestPackagesQuery, GetLatestPackagesQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "GetLatestPackages" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "offset" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "Int" } } },
					directives: []
				},
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "limit" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "Int" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "latestPackages" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "offSet" },
								value: { kind: "Variable", name: { kind: "Name", value: "offset" } }
							},
							{
								kind: "Argument",
								name: { kind: "Name", value: "limit" },
								value: { kind: "Variable", name: { kind: "Name", value: "limit" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "packages" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "identifier" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "catalogSlug" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "packageSlug" },
															arguments: [],
															directives: []
														}
													]
												}
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "displayName" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "description" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "description" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "latestVersion" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "identifier" },
															arguments: [],
															directives: [],
															selectionSet: {
																kind: "SelectionSet",
																selections: [
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionMajor" },
																		arguments: [],
																		directives: []
																	},
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionMinor" },
																		arguments: [],
																		directives: []
																	},
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionPatch" },
																		arguments: [],
																		directives: []
																	}
																]
															}
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "createdAt" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "updatedAt" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "author" },
															arguments: [],
															directives: [],
															selectionSet: {
																kind: "SelectionSet",
																selections: [
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "username" },
																		arguments: [],
																		directives: []
																	}
																]
															}
														}
													]
												}
											}
										]
									}
								}
							]
						}
					}
				]
			}
		}
	]
};
export const LoginDocument: DocumentNode<LoginMutation, LoginMutationVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "mutation",
			name: { kind: "Name", value: "Login" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "username" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				},
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "password" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "login" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "username" },
								value: { kind: "Variable", name: { kind: "Name", value: "username" } }
							},
							{
								kind: "Argument",
								name: { kind: "Name", value: "password" },
								value: { kind: "Variable", name: { kind: "Name", value: "password" } }
							}
						],
						directives: []
					}
				]
			}
		}
	]
};
export const LogoutDocument: DocumentNode<LogoutMutation, LogoutMutationVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "mutation",
			name: { kind: "Name", value: "Logout" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "username" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				},
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "password" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [{ kind: "Field", name: { kind: "Name", value: "logout" }, arguments: [], directives: [] }]
			}
		}
	]
};
export const MeDocument: DocumentNode<MeQuery, MeQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "Me" },
			variableDefinitions: [],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "me" },
						arguments: [],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "emailAddress" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "firstName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "lastName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "username" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "nameIsPublic" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "location" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "twitterHandle" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "gitHubHandle" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "website" },
									arguments: [],
									directives: []
								}
							]
						}
					}
				]
			}
		}
	]
};
export const MyAPIKeysDocument: DocumentNode<MyAPIKeysQuery, MyAPIKeysQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "MyAPIKeys" },
			variableDefinitions: [],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "myAPIKeys" },
						arguments: [],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{ kind: "Field", name: { kind: "Name", value: "id" }, arguments: [], directives: [] },
								{
									kind: "Field",
									name: { kind: "Name", value: "label" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "scopes" },
									arguments: [],
									directives: []
								}
							]
						}
					}
				]
			}
		}
	]
};
export const MyCatalogsDocument: DocumentNode<MyCatalogsQuery, MyCatalogsQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "MyCatalogs" },
			variableDefinitions: [],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "myCatalogs" },
						arguments: [],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "identifier" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "registryHostname" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "registryPort" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "catalogSlug" },
												arguments: [],
												directives: []
											}
										]
									}
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "displayName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "description" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "website" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "isPublic" },
									arguments: [],
									directives: []
								}
							]
						}
					}
				]
			}
		}
	]
};
export const PackageDocument: DocumentNode<PackageQuery, PackageQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "Package" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "identifier" } },
					type: {
						kind: "NonNullType",
						type: { kind: "NamedType", name: { kind: "Name", value: "PackageIdentifierInput" } }
					},
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "package" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "identifier" },
								value: { kind: "Variable", name: { kind: "Name", value: "identifier" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "identifier" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "catalogSlug" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "packageSlug" },
												arguments: [],
												directives: []
											}
										]
									}
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "catalog" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "displayName" },
												arguments: [],
												directives: []
											}
										]
									}
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "displayName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "description" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "latestVersion" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "identifier" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "versionMajor" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "versionMinor" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "versionPatch" },
															arguments: [],
															directives: []
														}
													]
												}
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "packageFile" },
												arguments: [],
												directives: []
											}
										]
									}
								}
							]
						}
					}
				]
			}
		}
	]
};
export const SearchCatalogsDocument: DocumentNode<SearchCatalogsQuery, SearchCatalogsQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "SearchCatalogs" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "query" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				},
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "limit" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "Int" } } },
					directives: []
				},
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "offset" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "Int" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "searchCatalogs" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "query" },
								value: { kind: "Variable", name: { kind: "Name", value: "query" } }
							},
							{
								kind: "Argument",
								name: { kind: "Name", value: "limit" },
								value: { kind: "Variable", name: { kind: "Name", value: "limit" } }
							},
							{
								kind: "Argument",
								name: { kind: "Name", value: "offSet" },
								value: { kind: "Variable", name: { kind: "Name", value: "offset" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "catalogs" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "identifier" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "catalogSlug" },
															arguments: [],
															directives: []
														}
													]
												}
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "displayName" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "description" },
												arguments: [],
												directives: []
											}
										]
									}
								}
							]
						}
					}
				]
			}
		}
	]
};
export const SearchPackagesDocument: DocumentNode<SearchPackagesQuery, SearchPackagesQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "SearchPackages" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "query" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				},
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "limit" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "Int" } } },
					directives: []
				},
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "offset" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "Int" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "searchPackages" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "query" },
								value: { kind: "Variable", name: { kind: "Name", value: "query" } }
							},
							{
								kind: "Argument",
								name: { kind: "Name", value: "limit" },
								value: { kind: "Variable", name: { kind: "Name", value: "limit" } }
							},
							{
								kind: "Argument",
								name: { kind: "Name", value: "offSet" },
								value: { kind: "Variable", name: { kind: "Name", value: "offset" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "packages" },
									arguments: [],
									directives: [],
									selectionSet: {
										kind: "SelectionSet",
										selections: [
											{
												kind: "Field",
												name: { kind: "Name", value: "identifier" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "catalogSlug" },
															arguments: [],
															directives: []
														},
														{
															kind: "Field",
															name: { kind: "Name", value: "packageSlug" },
															arguments: [],
															directives: []
														}
													]
												}
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "displayName" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "description" },
												arguments: [],
												directives: []
											},
											{
												kind: "Field",
												name: { kind: "Name", value: "latestVersion" },
												arguments: [],
												directives: [],
												selectionSet: {
													kind: "SelectionSet",
													selections: [
														{
															kind: "Field",
															name: { kind: "Name", value: "identifier" },
															arguments: [],
															directives: [],
															selectionSet: {
																kind: "SelectionSet",
																selections: [
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionMajor" },
																		arguments: [],
																		directives: []
																	},
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionMinor" },
																		arguments: [],
																		directives: []
																	},
																	{
																		kind: "Field",
																		name: { kind: "Name", value: "versionPatch" },
																		arguments: [],
																		directives: []
																	}
																]
															}
														}
													]
												}
											}
										]
									}
								}
							]
						}
					}
				]
			}
		}
	]
};
export const UpdateMeDocument: DocumentNode<UpdateMeMutation, UpdateMeMutationVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "mutation",
			name: { kind: "Name", value: "UpdateMe" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "value" } },
					type: {
						kind: "NonNullType",
						type: { kind: "NamedType", name: { kind: "Name", value: "UpdateUserInput" } }
					},
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "updateMe" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "value" },
								value: { kind: "Variable", name: { kind: "Name", value: "value" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "emailAddress" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "firstName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "lastName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "username" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "nameIsPublic" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "location" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "twitterHandle" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "gitHubHandle" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "website" },
									arguments: [],
									directives: []
								}
							]
						}
					}
				]
			}
		}
	]
};
export const UserDocument: DocumentNode<UserQuery, UserQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "User" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "username" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "user" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "username" },
								value: { kind: "Variable", name: { kind: "Name", value: "username" } }
							}
						],
						directives: [],
						selectionSet: {
							kind: "SelectionSet",
							selections: [
								{
									kind: "Field",
									name: { kind: "Name", value: "emailAddress" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "firstName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "lastName" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "username" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "nameIsPublic" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "location" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "twitterHandle" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "gitHubHandle" },
									arguments: [],
									directives: []
								},
								{
									kind: "Field",
									name: { kind: "Name", value: "website" },
									arguments: [],
									directives: []
								}
							]
						}
					}
				]
			}
		}
	]
};
export const UsernameAvailableDocument: DocumentNode<UsernameAvailableQuery, UsernameAvailableQueryVariables> = {
	kind: "Document",
	definitions: [
		{
			kind: "OperationDefinition",
			operation: "query",
			name: { kind: "Name", value: "UsernameAvailable" },
			variableDefinitions: [
				{
					kind: "VariableDefinition",
					variable: { kind: "Variable", name: { kind: "Name", value: "username" } },
					type: { kind: "NonNullType", type: { kind: "NamedType", name: { kind: "Name", value: "String" } } },
					directives: []
				}
			],
			directives: [],
			selectionSet: {
				kind: "SelectionSet",
				selections: [
					{
						kind: "Field",
						name: { kind: "Name", value: "usernameAvailable" },
						arguments: [
							{
								kind: "Argument",
								name: { kind: "Name", value: "username" },
								value: { kind: "Variable", name: { kind: "Name", value: "username" } }
							}
						],
						directives: []
					}
				]
			}
		}
	]
};
