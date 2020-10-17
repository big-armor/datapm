---
id: registry-api
title: DataPM Registry GraphQL API
sidebar_label: Registry API
---

DataPM registries provide an [Apollo GraphQL](https://www.apollographql.com) based GraphQL API. This API is used by the web client and DataPM Command Line Client, and you can write your own integrations using this same API.

Apollo has a great ["Why GraphQL?"](https://www.apollographql.com/docs/intro/benefits/) article with an introduction to the concepts and benefits of GraphQL.

## API Playground

You can access a live "graphql api playground" at [datapm.io/graphql](https://datapm.io/graphql) or at the "/graphql" relative url for any privately hosted registry. The playground allows you to create and test queries and mutations.

Use the "docs" and "schema" tabs on the right side of the playground window to access the details of every operation available in the DataPM Registry GraphQL API.

## API Keys and Authorization

DataPM provides a simple token based API key for machine-to-machine access to the registry graphql API.

**Note: API Keys are secrets!** Never share your API Keys. Never check API Keys into code repos, email them, or send them in non-secure chat messages.

### Generate an API Key

1. Register as a user on the target datapm registry
   1. You can use the public [datapm.io/sign-up](https://datapm.io/sign-up)
   1. Or host your own private registry
1. Log-in to your new account
1. Click your profile icon in the upper right
1. Click "API Keys"
1. Click "Create API Key"
1. (Optional) Copy the example registry config and API Key command
1. (Optional) Paste that command into your terminal to ensure you have command line access to the registry

### Authenticating with an API Key request header

You can submit an API key in the "Authorization" HTTP request header to authenticate with the DataPM Registry GraphQL API. You can use this same Authorization Bearer header in the "Headers" section at the bottom of the graphql playground.

```
{
    "Authorization": "Bearer YOUR-API-TOKEN-HERE"
}
```

## Object Overview

The [DataPM Concepts](concepts.md) page contains details about logical of a DataPM registry. The following describes the high level concepts of the registry API GraphQL object types and how they map to those concepts.

### Object: Catalog

A catalog is, like a real world magazine catalog, published by a person or organization and contains a list of available DataPM Packages. Catalogs are uniquely identified by their "slug" or "catalogSlug" reference.

Catalogs may be public or private, and may have one or more user with a Permission to access or edit them. Every user has a catalog that matches their username.

```
type Catalog {
    identifier: CatalogIdentifier!
    displayName: String!
    description: String
    website: String
    isPublic: Boolean!
    userPermissions: [UserCatalog!]
    packages: [Package]
}

type CatalogIdentifierInput {
    catalogSlug: String!
}

type CatalogIdentifier {
    registryHostname: String!
    registryPort: Int!
    catalogSlug: String!
}
```

#### Catalog Queries and Mutations

Here are some queries and mutations of interest for catalogs. More methods exist, and you can find them in the [playground](/playground).

```gql
query myCatalogs: [Catalog]!

query catalog(identifier: CatalogIdentifierInput!): Catalog

mutation createCatalog(value: CreateCatalogInput!): Catalog!

mutation updateCatalog(identifier: CatalogIdentifierInput!, value: UpdateCatalogInput!): Catalog!

mutation disableCatalog(identifier: CatalogIdentifierInput!): Catalog!
```

### Object: Packages

A package is a single offering of one or more data sets. Each package is a part of one and only one catalog, and present in zero or more collections. Packages on a registry have versions, and each version represents a single package file versioned.

Here is the general structure of a package object.

```
type Package {
    identifier: PackageIdentifier!
    catalog: Catalog!
    displayName: String!
    description: String
    latestVersion: Version
    versions: [Version]!
}

type PackageIdentifierInput {
    catalogSlug: String!
    packageSlug: String!
}

type PackageIdentifier {
    registryHostname: String!
    registryPort: Int!
    catalogSlug: String!
    packageSlug: String!
}
```

#### Package Queries and Mutations

Here are some queries and mutations of interest for packages.More methods exist, and you can find them in the [playground](/playground).

```gql
query package(identifier: PackageIdentifierInput!): Package

query searchPackages(query: String!, offSet: Int!, limit: Int!): SearchPackagesResult!

mutation createPackage(value: CreatePackageInput!): Package!

mutation updatePackage(identifier: PackageIdentifierInput!, value: UpdatePackageInput!): Package!

mutation disablePackage(identifier: PackageIdentifierInput!): Package!

mutation setPackagePermissions(identifier: PackageIdentifierInput!, value:SetPackagePermissionInput!): UserPackagePermissions!

mutation removePackagePermissions(identifier: PackageIdentifierInput!, username: String!): Void

```

### Object: Collections

Collections are groupings of two or more packages for the purposes of organizing packages into logical groups. Collections are curated by one or more users, and may be private or public.

Packages may be added to zero or more collections.

```text
type Collection {
    identifier: CollectionIdentifier!
    name: String!
    description: String
    packages: [Package!]
}


type CollectionIdentifierInput {
    collectionSlug: String!
}

type CollectionIdentifier {
    registryHostname: String!
    registryPort: Int!
    collectionSlug: String!
}

```

#### Collection Queries and Mutations

Here are some queries and mutations of interest for collections. More methods exist, and you can find them in the [playground](/playground).

```
query collection(identifier: CollectionIdentifierInput!): Collection

query searchCollections(query: String!, offset: Int!, limit: Int!): SearchCollectionResult!

mutation createCollection(value: CreateCollectionInput!): Collection!

mutation updateCollection(identifier: CollectionIdentifierInput!, value: UpdateCollectionInput!):Collection!

disableCollection(identifier: CollectionIdentifierInput!): Collection!

```

### Object: User

A user is a real world person account on a DataPM registry. You will only be able to access fields such as firstName, lastName, etc if the corresponding "isPublic" property is true for users other than yourself.

```text
type User {
    username: String!
    firstName: String
    lastName: String
    location: String
    twitterHandle: String
    website: String
    emailAddress: String
    gitHubHandle: String
    nameIsPublic: Boolean!
}
```

Here are some of the most used endpoints for Users.

```text

query user(username: String!): User

query login(username: String!, password: String!): String!

query usersByCatalog(identifier: CatalogIdentifierInput!): [User]!

mutation removeUserFromCatalog(username: String!, catalogSlug: String!): User!

mutation removePackagePermissions(identifier: PackageIdentifierInput!, username: String!): Void

```

### Other Objects

There are more objects that you will find defined in the [playground](/playground).
