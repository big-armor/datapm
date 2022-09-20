import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    CatalogFollowersCountDocument,
    CatalogFollowersDocument,
    CollectionFollowersCountDocument,
    CollectionFollowersDocument,
    CreateCatalogDocument,
    CreateCollectionDocument,
    CreatePackageDocument,
    NotificationFrequency,
    PackageFollowersCountDocument,
    PackageFollowersDocument,
    SaveFollowDocument
} from "./registry-client";
import { createUser } from "./test-utils";

describe("Followers Tests", async () => {
    const userAUsername = "followers-user-a";
    const userBUsername = "followers-user-b";

    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            userAUsername,
            userAUsername + "@test.datapm.io",
            "passwordA!"
        );
        expect(userAClient).to.not.equal(undefined);

        userBClient = await createUser(
            "FirstB",
            "LastB",
            userBUsername,
            userBUsername + "@test.datapm.io",
            "passwordB!"
        );
        expect(userBClient).to.not.equal(undefined);
    });

    it("Catalog followers returns followers list and count", async function () {
        const catalogSlug = "flwrs-ctg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const catalogFollowers = await userAClient.query({
            query: CatalogFollowersDocument,
            variables: {
                identifier: {
                    catalogSlug
                },
                limit: 10,
                offset: 0
            }
        });

        expect(catalogFollowers.errors == null).to.equal(true);
        expect(catalogFollowers.data.catalogFollowers.count).to.equal(1);
        expect(catalogFollowers.data.catalogFollowers.followers?.some((f) => f.username === userAUsername)).to.equal(
            true
        );
    });

    it("Catalog followers throws error when user has no permissions", async function () {
        const catalogSlug = "prv-flwrs-ctg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const catalogFollowers = await userBClient.query({
            query: CatalogFollowersDocument,
            variables: {
                identifier: {
                    catalogSlug
                },
                limit: 10,
                offset: 0
            }
        });

        expect(catalogFollowers.errors != null).to.equal(true);
        expect(catalogFollowers.data == null).to.equal(true);
        expect(catalogFollowers.errors?.some((e) => e.message === "NOT_AUTHORIZED")).to.equal(true);
    });

    it("Catalog followers count returns count", async function () {
        const catalogSlug = "flwrs-cnt-ctg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const catalogFollowers = await userAClient.query({
            query: CatalogFollowersCountDocument,
            variables: {
                identifier: {
                    catalogSlug
                }
            }
        });

        expect(catalogFollowers.errors == null).to.equal(true);
        expect(catalogFollowers.data.catalogFollowersCount).to.equal(1);
    });

    it("Catalog followers count throws error when user has no permissions", async function () {
        const catalogSlug = "prv-flwrs-cnt-ctg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    catalog: {
                        catalogSlug: catalogSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const catalogFollowers = await userBClient.query({
            query: CatalogFollowersCountDocument,
            variables: {
                identifier: {
                    catalogSlug
                }
            }
        });

        expect(catalogFollowers.errors != null).to.equal(true);
        expect(catalogFollowers.data == null).to.equal(true);
        expect(catalogFollowers.errors?.some((e) => e.message === "NOT_AUTHORIZED")).to.equal(true);
    });

    it("Collection followers returns followers list and count", async function () {
        const collectionSlug = "flwrs-col";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "My collection",
                    description: "My description",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const collectionFollowers = await userAClient.query({
            query: CollectionFollowersDocument,
            variables: {
                identifier: {
                    collectionSlug
                },
                limit: 10,
                offset: 0
            }
        });

        expect(collectionFollowers.errors == null).to.equal(true);
        expect(collectionFollowers.data.collectionFollowers.count).to.equal(1);
        expect(
            collectionFollowers.data.collectionFollowers.followers?.some((f) => f.username === userAUsername)
        ).to.equal(true);
    });

    it("Collection followers throws error when user has no permissions", async function () {
        const collectionSlug = "flwrs-col-prvt";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "My collection",
                    description: "My description",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const collectionFollowers = await userBClient.query({
            query: CollectionFollowersDocument,
            variables: {
                identifier: {
                    collectionSlug
                },
                limit: 10,
                offset: 0
            }
        });

        expect(collectionFollowers.errors != null).to.equal(true);
        expect(collectionFollowers.data == null).to.equal(true);
        expect(collectionFollowers.errors?.some((e) => e.message === "NOT_AUTHORIZED")).to.equal(true);
    });

    it("Collection followers count returns followers count", async function () {
        const collectionSlug = "flwrs-cnt-col";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "My collection",
                    description: "My description",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const collectionFollowers = await userAClient.query({
            query: CollectionFollowersCountDocument,
            variables: {
                identifier: {
                    collectionSlug
                }
            }
        });

        expect(collectionFollowers.errors == null).to.equal(true);
        expect(collectionFollowers.data.collectionFollowersCount).to.equal(1);
    });

    it("Collection followers count throws error when user has no permissions", async function () {
        const collectionSlug = "flwrs-cnt-col-prvt";

        await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: collectionSlug,
                    name: "My collection",
                    description: "My description",
                    isPublic: false
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    collection: {
                        collectionSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const collectionFollowers = await userBClient.query({
            query: CollectionFollowersCountDocument,
            variables: {
                identifier: {
                    collectionSlug
                }
            }
        });

        expect(collectionFollowers.errors != null).to.equal(true);
        expect(collectionFollowers.data == null).to.equal(true);
        expect(collectionFollowers.errors?.some((e) => e.message === "NOT_AUTHORIZED")).to.equal(true);
    });

    it("Package followers returns followers list and count", async function () {
        const catalogSlug = "flwrs-prv-ctg";
        const packageSlug = "flwrs-prv-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug,
                    packageSlug,
                    displayName: "My package",
                    description: "My package description"
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug,
                        packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const packageFollowers = await userAClient.query({
            query: PackageFollowersDocument,
            variables: {
                identifier: {
                    catalogSlug,
                    packageSlug
                },
                limit: 10,
                offset: 0
            }
        });

        expect(packageFollowers.errors == null).to.equal(true);
        expect(packageFollowers.data.packageFollowers.count).to.equal(1);
        expect(packageFollowers.data.packageFollowers.followers?.some((f) => f.username === userAUsername)).to.equal(
            true
        );
    });

    it("Package followers throws error when user has no permissions", async function () {
        const catalogSlug = "flwrs-pkx-ctg";
        const packageSlug = "flwrs-pkx-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug,
                    packageSlug,
                    displayName: "My package",
                    description: "My package description"
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug,
                        packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const packageFollowers = await userBClient.query({
            query: PackageFollowersDocument,
            variables: {
                identifier: {
                    catalogSlug,
                    packageSlug
                },
                limit: 10,
                offset: 0
            }
        });

        expect(packageFollowers.errors != null).to.equal(true);
        expect(packageFollowers.data == null).to.equal(true);
        expect(packageFollowers.errors?.some((e) => e.message === "NOT_AUTHORIZED")).to.equal(true);
    });

    it("Package followers count returns followers count", async function () {
        const catalogSlug = "flwrs-cnt-prv-ctg";
        const packageSlug = "flwrs-cnt-prv-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug,
                    packageSlug,
                    displayName: "My package",
                    description: "My package description"
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug,
                        packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const packageFollowers = await userAClient.query({
            query: PackageFollowersCountDocument,
            variables: {
                identifier: {
                    catalogSlug,
                    packageSlug
                }
            }
        });

        expect(packageFollowers.errors == null).to.equal(true);
        expect(packageFollowers.data.packageFollowersCount).to.equal(1);
    });

    it("Package followers count throws error when user has no permissions", async function () {
        const catalogSlug = "flwrs-cnt-pkx-ctg";
        const packageSlug = "flwrs-cnt-pkx-pkg";

        await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: catalogSlug,
                    displayName: "User A Second Catalog",
                    description: "This is an integration test User A second catalog",
                    website: "https://usera.datapm.io",
                    isPublic: true
                }
            }
        });

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug,
                    packageSlug,
                    displayName: "My package",
                    description: "My package description"
                }
            }
        });

        await userAClient.mutate({
            mutation: SaveFollowDocument,
            variables: {
                follow: {
                    package: {
                        catalogSlug,
                        packageSlug
                    },
                    notificationFrequency: NotificationFrequency.DAILY
                }
            }
        });

        const packageFollowers = await userBClient.query({
            query: PackageFollowersCountDocument,
            variables: {
                identifier: {
                    catalogSlug,
                    packageSlug
                }
            }
        });

        expect(packageFollowers.errors != null).to.equal(true);
        expect(packageFollowers.data == null).to.equal(true);
        expect(packageFollowers.errors?.some((e) => e.message === "NOT_AUTHORIZED")).to.equal(true);
    });
});
