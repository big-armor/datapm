/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    leastCompatible,
    compareSchema,
    Compability,
    DifferenceType,
    diffCompatibility,
    nextVersion,
    comparePackages,
    compareProperties
} from "../src/PackageUtil";
import {
    Schema,
    Properties,
    PackageFile,
    catalogSlugValid,
    packageSlugValid,
    collectionSlugValid,
    Source,
    compareSource,
    compareSources,
    UpdateMethod
} from "../src/main";
import { SemVer } from "semver";
import { expect } from "chai";

describe("Checking VersionUtil", () => {
    it("Compatibility ENUM Order", () => {
        expect(leastCompatible(Compability.Identical, Compability.BreakingChange)).equal(Compability.BreakingChange);
    });

    it("No change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.Identical);

        expect(oldVersion.version).equal("1.0.3");
        expect(newVersion.version).equal("1.0.3");
    });

    it("Minor change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.MinorChange);

        expect(oldVersion.version).equal("1.0.3");
        expect(newVersion.version).equal("1.0.4");
    });

    it("Compatible change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.CompatibleChange);

        expect(oldVersion.version).equal("1.0.3");
        expect(newVersion.version).equal("1.1.0");
    });

    it("Breaking change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.BreakingChange);

        expect(oldVersion.version).equal("1.0.3");
        expect(newVersion.version).equal("2.0.0");
    });

    it("Simple property schema comparison", () => {
        const propertiesA1: Properties = {
            propertyA: {
                title: "propertyA",
                types: {
                    string: {}
                }
            }
        };

        const propertiesA2: Properties = {
            propertyA: {
                title: "propertyA",
                types: {
                    string: {}
                }
            }
        };

        expect(compareProperties(propertiesA1, propertiesA2).length).equal(0);

        propertiesA2.propertyA.types!.date = {};

        const changeType = compareProperties(propertiesA1, propertiesA2);

        expect(changeType[0].type).equal(DifferenceType.CHANGE_PROPERTY_TYPE);
        expect(changeType[0].pointer).equal("#/properties/propertyA");
    });

    it("Type arrays vs singluar values", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            properties: {
                string: {
                    title: "string",
                    types: {
                        string: {}
                    }
                },
                number: {
                    title: "number",
                    types: {
                        number: {}
                    }
                }
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            properties: {
                string: {
                    title: "string",
                    types: {
                        string: {}
                    }
                },
                number: {
                    title: "number",
                    types: {
                        number: {}
                    }
                }
            }
        };

        const diff = compareSchema(schemaA1, schemaA2);

        expect(diff.length).equal(0);

        (schemaA1.properties as Properties).string.types!.number = {};

        const arrayVsNotDiff = compareSchema(schemaA1, schemaA2);

        expect(arrayVsNotDiff.length).equal(1);
        expect(arrayVsNotDiff[0].type).equal(DifferenceType.CHANGE_PROPERTY_TYPE);

        (schemaA2.properties as Properties).string.types!.number = {};

        const equalDiff = compareSchema(schemaA1, schemaA2);

        expect(equalDiff.length).equal(0);
    });

    it("Schema comparison", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            properties: {
                string: { title: "string", types: { string: {} } },
                number: { title: "number", types: { number: {} } }
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            properties: {
                string: { title: "string", types: { string: {} } },
                number: { title: "number", types: { number: {} } }
            }
        };

        const diff = compareSchema(schemaA1, schemaA2);

        expect(diff.length).equal(0);

        schemaA2.properties.boolean = { title: "boolean", types: { boolean: {} } };

        const compatibleChange = compareSchema(schemaA1, schemaA2);

        expect(compatibleChange.length).equal(1);

        expect(compatibleChange[0].type).equal(DifferenceType.ADD_PROPERTY);

        schemaA1.properties.date = {
            title: "date",
            types: { date: {} }
        };

        const addPropertyDiff = compareSchema(schemaA1, schemaA2);
        expect(addPropertyDiff.length).equal(2);

        const propertyRemoved = addPropertyDiff.find((d) => d.type === DifferenceType.ADD_PROPERTY);

        expect(propertyRemoved != null).equal(true);

        schemaA1.properties.boolean = { title: "boolean", types: { boolean: {} } };
        schemaA2.properties.date = {
            title: "date",
            types: { date: {} }
        };

        const finalDiff = compareSchema(schemaA1, schemaA2);
        expect(finalDiff).length(0);
    });

    it("Diff compatibility testing", () => {
        expect(nextVersion(new SemVer("1.0.2"), Compability.BreakingChange).version).equal(new SemVer("2.0.0").version);

        expect(nextVersion(new SemVer("1.0.3"), Compability.CompatibleChange).version).equal(
            new SemVer("1.1.0").version
        );

        expect(nextVersion(new SemVer("1.0.3"), Compability.MinorChange).version).equal(new SemVer("1.0.4").version);
    });

    it("Nested Objects Comparison", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            properties: {
                object: {
                    title: "object",
                    types: {
                        object: {
                            objectProperties: {
                                string1: { title: "string1", types: { string: {} } }
                            }
                        }
                    }
                },
                number: { title: "number", types: { number: {} } }
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            properties: {
                object: {
                    title: "object",
                    types: {
                        object: {
                            objectProperties: {
                                string1: { title: "string1", types: { string: {} } }
                            }
                        }
                    }
                },
                number: { title: "number", types: { number: {} } }
            }
        };

        const firstDiff = compareSchema(schemaA1, schemaA2);
        expect(firstDiff).length(0);

        expect(diffCompatibility(firstDiff)).equal(Compability.Identical);

        (schemaA2.properties.object.types.object?.objectProperties as Properties).string2 = {
            title: "string2",
            types: { string: {} }
        };

        const compatibleDiff = compareSchema(schemaA1, schemaA2);

        expect(compatibleDiff).length(1);

        expect(compatibleDiff[0].type).equal(DifferenceType.ADD_PROPERTY);
        expect(compatibleDiff[0].pointer).equal("#/SchemaA/properties/object/properties/string2");

        const compatibleComparison = diffCompatibility(compatibleDiff);

        expect(compatibleComparison).equal(Compability.CompatibleChange);

        (schemaA1.properties.object.types.object?.objectProperties as Properties).string3 = {
            title: "string3",
            types: { string: {} }
        };
        (schemaA1.properties.object.types.object?.objectProperties as Properties).string4 = {
            title: "string4",
            types: { string: {} }
        };

        const breakingDiff = compareSchema(schemaA1, schemaA2);
        expect(breakingDiff).length(3);

        expect(breakingDiff[0].type).equal(DifferenceType.REMOVE_PROPERTY);
        expect(breakingDiff[0].pointer).equal("#/SchemaA/properties/object/properties/string3");
        expect(breakingDiff[1].type).equal(DifferenceType.REMOVE_PROPERTY);
        expect(breakingDiff[1].pointer).equal("#/SchemaA/properties/object/properties/string4");
        expect(breakingDiff[2].type).equal(DifferenceType.ADD_PROPERTY);
        expect(breakingDiff[2].pointer).equal("#/SchemaA/properties/object/properties/string2");

        const breakingChange = diffCompatibility(breakingDiff);

        expect(breakingChange).equal(Compability.BreakingChange);

        (schemaA1.properties.object.types.object?.objectProperties as Properties).string2 = {
            title: "string2",
            types: { string: {} }
        };
        (schemaA2.properties.object.types.object?.objectProperties as Properties).string3 = {
            title: "string2",
            types: { string: {} }
        };
        (schemaA2.properties.object.types.object?.objectProperties as Properties).string4 = {
            title: "string3",
            types: { string: {} }
        };

        const finalDiff = compareSchema(schemaA1, schemaA2);

        expect(finalDiff).length(0);

        expect(diffCompatibility(finalDiff)).equal(Compability.Identical);
    });

    it("Catalog slug validation", () => {
        expect(catalogSlugValid("a")).equal(true);
        expect(catalogSlugValid("0")).equal(true);
        expect(catalogSlugValid("a-b")).equal(true);
        expect(catalogSlugValid("a-b-123")).equal(true);
        expect(catalogSlugValid("a".repeat(39))).equal("CATALOG_SLUG_TOO_LONG");

        expect(catalogSlugValid(undefined)).equal("CATALOG_SLUG_REQUIRED");
        expect(catalogSlugValid("")).equal("CATALOG_SLUG_REQUIRED");
        expect(catalogSlugValid("a_b")).equal("CATALOG_SLUG_INVALID");
        expect(catalogSlugValid("a--b")).equal("CATALOG_SLUG_INVALID");
        expect(catalogSlugValid("a-b-")).equal("CATALOG_SLUG_INVALID");
        expect(catalogSlugValid("-a-b")).equal("CATALOG_SLUG_INVALID");
    });

    it("Package slug validation", () => {
        expect(packageSlugValid("a")).equal(true);
        expect(packageSlugValid("0")).equal(true);
        expect(packageSlugValid("a.b")).equal(true);
        expect(packageSlugValid("a--b")).equal(true);
        expect(packageSlugValid("a__b")).equal(true);
        expect(packageSlugValid("a__b----c.123")).equal(true);
        expect(packageSlugValid("a".repeat(100))).equal("PACKAGE_SLUG_TOO_LONG");

        expect(packageSlugValid(undefined)).equal("PACKAGE_SLUG_REQUIRED");
        expect(packageSlugValid("")).equal("PACKAGE_SLUG_REQUIRED");
        expect(packageSlugValid(".")).equal("PACKAGE_SLUG_INVALID");
        expect(packageSlugValid("-")).equal("PACKAGE_SLUG_INVALID");
        expect(packageSlugValid("_")).equal("PACKAGE_SLUG_INVALID");
        expect(packageSlugValid("a@b")).equal("PACKAGE_SLUG_INVALID");
        expect(packageSlugValid("a.")).equal("PACKAGE_SLUG_INVALID");
        expect(packageSlugValid("a..b")).equal("PACKAGE_SLUG_INVALID");
        expect(packageSlugValid("a-")).equal("PACKAGE_SLUG_INVALID");
        expect(packageSlugValid("a_")).equal("PACKAGE_SLUG_INVALID");
        expect(packageSlugValid("a___c")).equal("PACKAGE_SLUG_INVALID");
    });

    it("Collection slug validation", () => {
        expect(collectionSlugValid("a")).equal(true);
        expect(collectionSlugValid("a--b")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a__b")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a__b----c.123")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a".repeat(101))).equal("COLLECTION_SLUG_TOO_LONG");
        expect(collectionSlugValid(undefined)).equal("COLLECTION_SLUG_REQUIRED");
        expect(collectionSlugValid("a.b")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("")).equal("COLLECTION_SLUG_REQUIRED");
        expect(collectionSlugValid("0")).equal(true);
        expect(collectionSlugValid(".")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("-")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("_")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a@b")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a.")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a..b")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a-")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a_")).equal("COLLECTION_SLUG_INVALID");
        expect(collectionSlugValid("a___c")).equal("COLLECTION_SLUG_INVALID");
    });

    it("Compare source objects", () => {
        const sourceA: Source = {
            slug: "datapm",
            type: "test",
            connectionConfiguration: {},
            configuration: {
                uris: ["http://datapm.io/test", "http://datapm.io/test2"]
            },
            streamSets: [
                {
                    slug: "streamA",
                    lastUpdateHash: "abc123",
                    schemaTitles: ["A"],
                    streamStats: {
                        inspectedCount: 0
                    },
                    updateMethods: [],
                    endReached: false
                }
            ]
        };

        const sourceB: Source = {
            slug: "datapm",
            type: "test",
            connectionConfiguration: {},
            configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
            streamSets: [
                {
                    slug: "streamA",
                    lastUpdateHash: "abc123",
                    schemaTitles: ["A"],
                    streamStats: {
                        inspectedCount: 0
                    },
                    updateMethods: [],
                    endReached: false
                }
            ]
        };

        const diffs = compareSource(sourceA, sourceB);

        expect(diffs.length).equals(0);

        sourceA.streamSets[0].lastUpdateHash = "test";

        const diffs2 = compareSource(sourceA, sourceB);

        expect(diffs2[0].type).equal(DifferenceType.CHANGE_STREAM_UPDATE_HASH);

        sourceA.streamSets[0].lastUpdateHash = sourceB.streamSets[0].lastUpdateHash;

        expect(sourceA.configuration != null).eq(true);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        sourceA.configuration!.uris = ["http://datapm.io.test"];

        const diffs3 = compareSource(sourceA, sourceB);

        expect(diffs3[0].type).equal(DifferenceType.CHANGE_SOURCE_CONFIGURATION);
    });

    it("Compare source arrays", () => {
        const sourceA: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: {},
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                streamSets: [
                    {
                        slug: "streamA",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 0
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const sourceB: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: {},
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                streamSets: [
                    {
                        slug: "streamA",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 0
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const diffs = compareSources(sourceA, sourceB);

        expect(diffs.length).equals(0);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        sourceA[0].configuration!.uris = ["test"];

        const diffs2 = compareSources(sourceA, sourceB);

        expect(diffs2[0].type).equal(DifferenceType.CHANGE_SOURCE_CONFIGURATION);
    });

    it("Detected removed sources", () => {
        const sourceA: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: {},
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                streamSets: [
                    {
                        slug: "streamA",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 0
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const sourceB: Source[] = [
            {
                slug: "datapm2",
                type: "test",
                connectionConfiguration: {},
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                streamSets: [
                    {
                        slug: "streamA",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 0
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const diffs = compareSources(sourceA, sourceB);

        expect(diffs.length).equals(1);
        expect(diffs[0].type).equals(DifferenceType.REMOVE_SOURCE);
    });

    it("Stream status change detection", () => {
        const sourceA: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: {},
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 0
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const sourceB: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: {},
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const diffs = compareSources(sourceA, sourceB);

        expect(diffs.length).equals(1);

        expect(diffs[0].type).equal(DifferenceType.CHANGE_STREAM_STATS);

        sourceB[0].streamSets[0].slug += "!";

        const diffs2 = compareSources(sourceA, sourceB);

        expect(diffs2.length).equals(1);

        expect(diffs2[0].type).equal(DifferenceType.REMOVE_STREAM_SET);
    });

    it("Source connection detection", () => {
        const sourceA: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                configuration: {},
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const sourceB: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: {
                    uris: ["http://datapm.io/test", "http://datapm.io/test2"],
                    newValue: "a"
                },
                configuration: {},
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const diffs = compareSources(sourceA, sourceB);

        expect(diffs.length).equals(1);

        expect(diffs[0].type).equal(DifferenceType.CHANGE_SOURCE_CONNECTION);
    });

    it("Source credentials detection", () => {
        const sourceA: Source[] = [
            {
                slug: "datapm",
                type: "test",
                credentialsIdentifier: "test",
                connectionConfiguration: {},
                configuration: {},
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const sourceB: Source[] = [
            {
                slug: "datapm",
                type: "test",
                credentialsIdentifier: "test2",
                connectionConfiguration: {},
                configuration: {},
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const diffs = compareSources(sourceA, sourceB);

        expect(diffs.length).equals(1);

        expect(diffs[0].type).equal(DifferenceType.CHANGE_SOURCE_CREDENTIALS);
    });

    it("Source configuration detection", () => {
        const sourceA: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: {},
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const sourceB: Source[] = [
            {
                slug: "datapm",
                type: "test",
                configuration: {
                    uris: ["http://datapm.io/test", "http://datapm.io/test2"],
                    newValue: "a"
                },
                connectionConfiguration: {},
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [],
                        endReached: false
                    }
                ]
            }
        ];

        const diffs = compareSources(sourceA, sourceB);

        expect(diffs.length).equals(1);

        expect(diffs[0].type).equal(DifferenceType.CHANGE_SOURCE_CONFIGURATION);
    });

    it("Source configuration detection", () => {
        const sourceA: Source[] = [
            {
                slug: "datapm",
                type: "test",
                connectionConfiguration: {},
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [UpdateMethod.BATCH_FULL_SET],
                        endReached: false
                    }
                ]
            }
        ];

        const sourceB: Source[] = [
            {
                slug: "datapm",
                type: "test",
                configuration: { uris: ["http://datapm.io/test", "http://datapm.io/test2"] },
                connectionConfiguration: {},
                streamSets: [
                    {
                        slug: "test",
                        lastUpdateHash: "abc123",
                        schemaTitles: ["A"],
                        streamStats: {
                            inspectedCount: 1
                        },
                        updateMethods: [UpdateMethod.APPEND_ONLY_LOG],
                        endReached: false
                    }
                ]
            }
        ];

        const diffs = compareSources(sourceA, sourceB);

        expect(diffs.length).equals(1);

        expect(diffs[0].type).equal(DifferenceType.CHANGE_STREAM_UPDATE_METHOD);
    });

    it("Package File updated dates", function () {
        const packageFileA: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            sources: []
        };

        const packageFileB: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            sources: []
        };

        expect(comparePackages(packageFileA, packageFileB).some((d) => d.type === "CHANGE_UPDATED_DATE")).equal(false);

        packageFileB.updatedDate = new Date(new Date().getTime() - 100);

        const diff = comparePackages(packageFileA, packageFileB);

        expect(diff.some((d) => d.type === "CHANGE_UPDATED_DATE")).equal(true);
    });

    it("Package File updated versions", function () {
        const packageFileA: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],
            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test"
        };

        const packageFileB: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test"
        };

        expect(comparePackages(packageFileA, packageFileB).some((d) => d.type === "CHANGE_VERSION")).equal(false);

        packageFileB.version = "1.0.1";

        const diff = comparePackages(packageFileA, packageFileB);

        expect(diff.some((d) => d.type === "CHANGE_VERSION")).equal(true);
    });

    it("Package File updated readme", function () {
        const packageFileA: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],

            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            readmeMarkdown: "Some readme content"
        };

        const packageFileB: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],

            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            readmeMarkdown: packageFileA.readmeMarkdown
        };

        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_README_MARKDOWN)
        ).equal(false);

        packageFileB.readmeFile = "some-new-file.README.md";
        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_README_FILE)
        ).equal(true);

        packageFileB.readmeMarkdown = "other content";

        const diff = comparePackages(packageFileA, packageFileB);

        expect(diff.some((d) => d.type === DifferenceType.CHANGE_README_MARKDOWN)).equal(true);
    });

    it("Package File updated license", function () {
        const packageFileA: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],

            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            licenseMarkdown: "Some content"
        };

        const packageFileB: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            licenseMarkdown: packageFileA.licenseMarkdown
        };

        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_LICENSE_MARKDOWN)
        ).equal(false);

        packageFileB.licenseFile = "some-new-file.LICENSE.md";
        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_LICENSE_FILE)
        ).equal(true);

        packageFileB.licenseMarkdown = "other content";

        const diff = comparePackages(packageFileA, packageFileB);

        expect(diff.some((d) => d.type === DifferenceType.CHANGE_LICENSE_MARKDOWN)).equal(true);
    });

    it("Package File updated contact email", function () {
        const packageFileA: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],

            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            readmeMarkdown: "Some readme content",
            contactEmail: "test@test.com"
        };

        const packageFileB: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],

            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            readmeMarkdown: packageFileA.readmeMarkdown,
            contactEmail: packageFileA.contactEmail
        };

        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_CONTACT_EMAIL)
        ).equal(false);

        packageFileB.contactEmail = "testb@test.com";
        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_CONTACT_EMAIL)
        ).equal(true);
    });

    it("Package File updated website", function () {
        const packageFileA: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],

            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            readmeMarkdown: "Some readme content",
            contactEmail: "test@test.com",
            website: "https://dreamingwell.com"
        };

        const packageFileB: PackageFile = {
            ...new PackageFile(),
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            sources: [],

            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            readmeMarkdown: packageFileA.readmeMarkdown,
            contactEmail: packageFileA.contactEmail,
            website: packageFileA.website
        };

        expect(comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_WEBSITE)).equal(
            false
        );

        packageFileB.website = "https://datapm.io";
        expect(comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_WEBSITE)).equal(
            true
        );
    });

    it("Compare hidden properties", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            properties: {
                string: { title: "string", types: { string: {} } },
                number: { title: "number", types: { number: {} } }
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            properties: {
                string: { title: "string", types: { string: {} } },
                number: { title: "number", types: { number: {} } }
            }
        };

        const diff = compareSchema(schemaA1, schemaA2);

        expect(diff.length).equal(0);

        (schemaA2.properties as Properties).string.hidden = true;

        const propertyHiddenDiff = compareSchema(schemaA1, schemaA2);

        expect(propertyHiddenDiff.length).equal(1);
        expect(propertyHiddenDiff[0].type).equal(DifferenceType.HIDE_PROPERTY);

        const propertyHiddenCompatibility = diffCompatibility(propertyHiddenDiff);
        expect(propertyHiddenCompatibility).equal(Compability.BreakingChange);

        (schemaA1.properties as Properties).string.hidden = true;
        delete (schemaA2.properties as Properties).string;

        const removeHiddenPropertyDiff = compareSchema(schemaA1, schemaA2);

        expect(removeHiddenPropertyDiff.length).equal(1);
        expect(removeHiddenPropertyDiff[0].type).equal(DifferenceType.REMOVE_HIDDEN_PROPERTY);

        const removeHiddenPropertyCompatibility = diffCompatibility(removeHiddenPropertyDiff);
        expect(removeHiddenPropertyCompatibility).equal(Compability.MinorChange);
    });

    it("Compare changing property unit", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            properties: {
                string: { title: "string", types: { string: {} } },
                number: { title: "number", types: { number: {} }, unit: "something" }
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            properties: {
                string: { title: "string", types: { string: {} } },
                number: { title: "number", types: { number: {} }, unit: "something" }
            }
        };

        const diff = compareSchema(schemaA1, schemaA2);

        expect(diff.length).equal(0);

        (schemaA2.properties as Properties).number.unit = "something else";

        const propertyHiddenDiff = compareSchema(schemaA1, schemaA2);

        expect(propertyHiddenDiff.length).equal(1);
        expect(propertyHiddenDiff[0].type).equal(DifferenceType.CHANGE_PROPERTY_UNIT);

        const propertyHiddenCompatibility = diffCompatibility(propertyHiddenDiff);
        expect(propertyHiddenCompatibility).equal(Compability.MinorChange);
    });

    // TODO Add test for removing a schema

    // TODO Add test for removing a hidden schema
});
