import chalk from "chalk";
import {
    comparePackages,
    diffCompatibility,
    nextVersion as getNextVersion,
    PackageFile,
    Properties,
    Schema,
    StreamSet
} from "datapm-lib";
import { JSONSchema7TypeName } from "json-schema";
import ora from "ora";
import { exit } from "process";
import prompts, { Choice } from "prompts";
import { SemVer } from "semver";
import { Permission } from "../generated/graphql";
import { getSourceByType, SourceInspectionContext } from "../source/SourceUtil";
import { getRegistryConfig } from "../util/ConfigUtil";
import { validPackageDisplayName, validShortPackageDescription, validUnit, validVersion } from "../util/IdentifierUtil";
import { getPackage } from "../util/PackageAccessUtil";
import { writeLicenseFile, writePackageFile, writeReadmeFile, differenceToString } from "../util/PackageUtil";
import { RegistryClient } from "../util/RegistryClient";
import { publishPackage } from "./PublishPackageCommand";
import clone from "rfdc";
import { cliHandleParameters, defaultPromptOptions } from "../util/ParameterUtils";
import { LogType } from "../util/LoggingUtils";
import { UpdateArguments } from "./UpdateCommand";
import { inspectSource, inspectStreamSet } from "./PackageCommandModule";

async function schemaPrompts(schema: Schema): Promise<void> {
    if (schema.properties == null) return;

    const currentExcludedAttributes = Object.keys(schema.properties).flatMap((key) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const p = schema.properties![key];
        if (p.hidden) return key;
        else return [];
    });

    const ignoreAttributesResponse = await prompts(
        [
            {
                type: "confirm",
                name: "ignoreAttributes",
                message: "Exclude any attributes?",
                initial: currentExcludedAttributes.length > 0
            }
        ],
        defaultPromptOptions
    );
    if (ignoreAttributesResponse.ignoreAttributes) {
        const attributesToIgnoreResponse = await prompts(
            [
                {
                    type: "multiselect",
                    name: "attributesToIgnore",
                    message: "Attributes to exclude?",
                    choices: Object.keys(schema.properties).map<Choice>((attributeName) => {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const title = schema.properties![attributeName].title!;

                        return {
                            title,
                            value: attributeName,
                            selected: currentExcludedAttributes.includes(attributeName)
                        };
                    })
                }
            ],
            defaultPromptOptions
        );
        Object.keys(schema.properties).forEach((key: string) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const property = schema.properties![key];
            property.hidden = attributesToIgnoreResponse.attributesToIgnore.includes(key);

            if (schema.sampleRecords) {
                schema.sampleRecords.forEach((record) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    if (property!.title != null) delete record[property!.title];
                });
            }
        });
    }

    const currentRenamedAttributes = Object.keys(schema.properties).filter((key) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return schema.properties![key].title !== key;
    });

    // Rename Attributes
    const renameAttributesResponse = await prompts(
        [
            {
                type: "confirm",
                name: "renameAttributes",
                message: "Rename attributes?",
                initial: currentRenamedAttributes.length > 0
            }
        ],
        defaultPromptOptions
    );

    if (renameAttributesResponse.renameAttributes) {
        const attributesToRenameResponse = await prompts(
            [
                {
                    type: "multiselect",
                    name: "attributesToRename",
                    message: "Attributes to rename?",
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    choices: Object.keys(schema.properties!).map<Choice>((attributeName) => {
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        const title = schema.properties![attributeName].title!;

                        return {
                            title,
                            value: attributeName,
                            selected: currentRenamedAttributes.includes(attributeName)
                        };
                    })
                }
            ],
            defaultPromptOptions
        );

        for (const attributeName of attributesToRenameResponse.attributesToRename) {
            let attributeText = attributeName;
            if (schema.properties[attributeName].title !== attributeName) {
                attributeText = `${schema.properties[attributeName].title} [original: ${attributeName}]`;
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const oldAttributeTitle = schema.properties[attributeName].title!;
            const attributeToRenameResponse = await prompts(
                [
                    {
                        type: "text",
                        name: "attributeToRename",
                        message: `New attribute name for "${attributeText}"?`,
                        initial: (schema.properties[attributeName].title || "") as string
                    }
                ],
                defaultPromptOptions
            );
            schema.properties[attributeName].title = attributeToRenameResponse.attributeToRename;
            if (schema.sampleRecords) {
                schema.sampleRecords.forEach((record) => {
                    record[attributeToRenameResponse.attributeToRename] = record[oldAttributeTitle];
                    delete record[oldAttributeTitle];
                });
            }
        }
    }

    const recordUnitResponse = await prompts(
        [
            {
                type: "text",
                name: "recordUnit",
                message: `What does each ${schema.title} record represent?`,
                initial: schema?.unit,
                validate: validUnit
            }
        ],
        defaultPromptOptions
    );
    if (recordUnitResponse.recordUnit) {
        schema.unit = recordUnitResponse.recordUnit;
    }
    // Prompt Column Unit per "number" Type Column
    const properties = schema.properties as Properties;
    const keys = Object.keys(properties).filter((key) => {
        const property = properties[key] as Schema;
        const type = property.type as JSONSchema7TypeName[];
        const types = type.filter((type) => type !== "null");
        return types.length === 1 && types[0] === "number";
    });

    if (keys.length > 1) {
        const confirmContinueResponse = await prompts(
            [
                {
                    type: "confirm",
                    name: "confirm",
                    message: `Do you want to edit units for the ${keys.length} number properties?`,
                    initial: false
                }
            ],
            defaultPromptOptions
        );
        if (confirmContinueResponse.confirm) {
            for (const key of keys) {
                const property = properties[key] as Schema;
                const columnUnitResponse = await prompts(
                    [
                        {
                            type: "text",
                            name: "columnUnit",
                            message: `Unit for attribute '${property.title}'?`,
                            initial: property?.unit,
                            validate: validUnit
                        }
                    ],
                    defaultPromptOptions
                );
                if (columnUnitResponse.columnUnit) {
                    property.unit = columnUnitResponse.columnUnit;
                }
            }
        }
    }
}

export async function updatePackage(argv: UpdateArguments): Promise<void> {
    const oraRef: ora.Ora = ora({
        color: "yellow",
        spinner: "dots"
    });

    if (argv.reference == null) {
        const referencePromptResult = await prompts(
            {
                type: "text",
                name: "reference",
                message: "What is the package file name or url?",
                validate: (value) => {
                    if (!value) return "Package file name or url required";
                    return true;
                }
            },
            defaultPromptOptions
        );
        argv.reference = referencePromptResult.reference;
    }

    if (argv.reference == null) throw new Error("Package file or URL is required");

    // Finding package
    oraRef.start("Finding package...");

    const packageFileWithContext = await getPackage(argv.reference).catch((error) => {
        oraRef.fail();
        console.log(chalk.red(error.message));
        process.exit(1);
    });

    const oldPackageFile = packageFileWithContext.packageFile;
    oraRef.succeed();

    // Validate the package registry URL and the permission to update
    if (packageFileWithContext.registryURL) {
        // Check if the API key was configured for the package registry URL
        const registryConfig = getRegistryConfig(packageFileWithContext.registryURL);
        if (!registryConfig?.apiKey) {
            console.log(
                chalk.red(
                    "You do not have an API key configured for this registry. You must first create an API Key, and add it to this client. Then you can retry this command"
                )
            );
            process.exit(1);
        }
        // Check if the user has EDIT permission before continuing
        const registryClient = new RegistryClient(registryConfig);
        const result = await registryClient.getCatalogs();
        if (
            result.data.myCatalogs.find(
                (c) =>
                    c.identifier.catalogSlug === packageFileWithContext.catalogSlug &&
                    c.myPermissions?.includes(Permission.EDIT)
            ) == null
        ) {
            console.log(
                chalk.red(
                    "The registry reports that you do not have permission to edit this package. Contact the author to request permissions."
                )
            );
            process.exit(1);
        }
    }

    const sourceInspectionContext: SourceInspectionContext = {
        defaults: argv.defaults || false,
        quiet: false,
        log: (type, message) => {
            if (type === LogType.INFO) oraRef.info(message);
            else if (type === LogType.WARN) oraRef.warn(message);
            else if (type === LogType.DEBUG) console.debug(message);
            else if (type === LogType.ERROR) oraRef.fail(message);
        },
        parameterPrompt: async (parameters) => {
            await cliHandleParameters(argv.defaults || false, parameters);
        }
    };

    let newPackageFile: PackageFile = clone()(oldPackageFile);
    newPackageFile.schemas = [];
    newPackageFile.sources = [];

    for (const sourceObject of oldPackageFile.sources) {
        const source = getSourceByType(sourceObject.type);

        if (source == null) {
            oraRef.fail("No source implementation found to inspect this data - " + sourceObject.type);
            exit(1);
        }

        const uriInspectionResults = await inspectSource(
            source,
            sourceInspectionContext,
            oraRef,
            sourceObject.configuration || {}
        );

        const streamSets: StreamSet[] = [];
        for (const streamSet of uriInspectionResults.streamSetPreviews) {
            const streamInspectionResult = await inspectStreamSet(
                streamSet,
                sourceInspectionContext,
                oraRef,
                sourceObject.configuration || {}
            );

            newPackageFile.schemas = [...newPackageFile.schemas, ...streamInspectionResult.schemas];
            streamSets.push({
                configuration: streamSet.configuration,
                schemaTitles: streamInspectionResult.schemas.map((s: Schema) => s.title as string),
                slug: streamSet.slug,
                streamStats: streamInspectionResult.streamStats,
                lastUpdateHash: streamSet.updateHash
            });
        }
        newPackageFile.sources.push({
            ...sourceObject,
            streamSets: streamSets
        });
    }

    // Apply attribute names to new schemas
    for (const oldSchema of oldPackageFile.schemas) {
        const newSchema = newPackageFile.schemas.find((s) => s.title === oldSchema.title);

        if (newSchema == null || newSchema.properties == null) continue;

        newSchema.unit = oldSchema.unit;

        for (const oldAttributeName in oldSchema.properties) {
            const oldProperty = oldSchema.properties[oldAttributeName];

            const newProperty = newSchema.properties[oldAttributeName];

            if (newProperty == null) continue;

            newProperty.title = oldProperty.title;
            newProperty.unit = oldProperty.unit;
            newProperty.hidden = oldProperty.hidden;
        }
    }

    // Show the user the package information

    console.log("");
    console.log(chalk.magenta("Inspection Result"));
    console.log(`${chalk.gray("Package slug: ")} ${chalk.yellow(oldPackageFile.packageSlug)}`);
    console.log(`${chalk.gray("Existing package description: ")} ${chalk.yellow(oldPackageFile.description)}`);
    for (const schema of oldPackageFile.schemas) {
        console.log(`${chalk.gray("Record count: ")} ${chalk.yellow(schema.recordCount)}`);
    }
    console.log(`${chalk.gray("Last updated date: ")} ${chalk.yellow(oldPackageFile.updatedDate)}`);

    let differences = comparePackages(oldPackageFile, newPackageFile);
    if (differences.length === 0) {
        console.log("No differences found");
    } else {
        console.log(`Found ${differences.length} differences`);
    }
    differences.forEach((difference) => {
        console.log(chalk.yellow(differenceToString(difference)));
    });

    console.log("");
    console.log(chalk.magenta("Schema Refinement"));

    if (!argv.defaults) {
        for (const schema of newPackageFile.schemas) {
            await schemaPrompts(schema);
        }
    }

    differences = comparePackages(oldPackageFile, newPackageFile);

    console.log("");
    console.log(chalk.magenta("Package Detail"));
    // Get next version
    const nextVersion = getNextVersion(new SemVer(oldPackageFile.version), diffCompatibility(differences)).version;

    // Prompt Display Name
    let displayNameResponse: prompts.Answers<"displayName">;
    if (argv.defaults) {
        displayNameResponse = {
            displayName: oldPackageFile.displayName
        };
        console.log(`User friendly package name: ${displayNameResponse.displayName}`);
    } else {
        displayNameResponse = await prompts(
            [
                {
                    type: "text",
                    name: "displayName",
                    message: "User friendly package name?",
                    initial: oldPackageFile.displayName,
                    validate: validPackageDisplayName
                }
            ],
            defaultPromptOptions
        );
    }

    // Prompt Package Slug, Version, Description
    let promptResponses: prompts.Answers<"packageSlug" | "version" | "description" | "website" | "sampleRecordCount">;

    const defaultSampleRecordCount = Math.min(
        ...newPackageFile.schemas.map((schema: Schema) => schema.sampleRecords?.length as number)
    );
    if (argv.defaults) {
        promptResponses = {
            packageSlug: oldPackageFile.packageSlug,
            version: nextVersion,
            description: oldPackageFile.description,
            website: oldPackageFile.website, // TODO - Better websites defaults. Handle github, etc,
            sampleRecordCount: defaultSampleRecordCount
        };
        console.log(`Default package short name: ${promptResponses.packageSlug}`);
        console.log(`Default starting version: ${promptResponses.version}`);
        console.log(`Default short package description: ${promptResponses.description}`);
    } else {
        promptResponses = {
            packageSlug: oldPackageFile.packageSlug,
            ...(await prompts(
                [
                    {
                        type: "text",
                        name: "version",
                        message: "Next version?",
                        initial: nextVersion,
                        validate: validVersion
                    },
                    {
                        type: "text",
                        name: "description",
                        message: "Short package description?",
                        initial: oldPackageFile.description,
                        validate: validShortPackageDescription
                    },
                    {
                        type: "text",
                        name: "website",
                        message: "Website?",
                        initial: oldPackageFile.website,
                        validate: validUrl
                    },
                    {
                        type: "number",
                        name: "sampleRecordCount",
                        message: "Number of sample records?",
                        initial: defaultSampleRecordCount,
                        validate: validSampleRecordCount
                    }
                ],
                defaultPromptOptions
            ))
        };
    }

    // Update the old package file with the new changes
    newPackageFile.schemas.forEach((schema) => {
        // Update sample records first
        if (promptResponses.sampleRecordCount > 0) {
            if (schema.sampleRecords) {
                schema.sampleRecords = schema.sampleRecords.slice(0, promptResponses.sampleRecordCount);
            }
        } else {
            delete schema.sampleRecords;
        }
        // Retain old property's description
        if (!schema.properties) return;
        const oldSchema = oldPackageFile.schemas.find((_schema) => _schema.title === schema.title);
        if (!oldSchema) return;
        if (!oldSchema.properties) return;
        Object.keys(schema.properties).forEach((key) => {
            const newProperty = (schema.properties as Properties)[key];
            const oldProperty = (oldSchema.properties as Properties)[key];
            if (!oldProperty) return;
            if (!newProperty.description && oldProperty.description) {
                newProperty.description = oldProperty.description;
            }
        });
    });

    newPackageFile = {
        ...newPackageFile,
        updatedDate: new Date(),
        displayName: displayNameResponse.displayName,
        packageSlug: promptResponses.packageSlug,
        version: promptResponses.version,
        description: promptResponses.description,
        readmeFile: `${promptResponses.packageSlug}.README.md`,
        licenseFile: `${promptResponses.packageSlug}.LICENSE.md`,
        website: promptResponses.website
    };

    // Write updates to the target package file in place
    oraRef.start("Writing package file...");
    let packageFileLocation;

    try {
        packageFileLocation = writePackageFile(newPackageFile);

        oraRef.succeed(`Wrote package file ${packageFileLocation}`);
    } catch (error) {
        oraRef.fail(`Unable to write the package file: ${error.message}`);
        process.exit(1);
    }

    oraRef.start("Writing README file...");
    try {
        const readmeFileLocation = writeReadmeFile(newPackageFile);
        oraRef.succeed(`Wrote README file ${readmeFileLocation}`);
    } catch (error) {
        oraRef.fail(`Unable to write the README file: ${error.message}`);
        process.exit(1);
    }

    oraRef.start("Writing LICENSE file...");
    try {
        const licenseFileLocation = writeLicenseFile(newPackageFile);
        oraRef.succeed(`Wrote LICENSE file ${licenseFileLocation}`);
    } catch (error) {
        oraRef.fail(`Unable to write the LICENSE file: ${error.message}`);
        process.exit(1);
    }

    // If it's just a local package, give the user the correct "datapm publish" command
    if (!packageFileWithContext.registryURL) {
        console.log("");
        console.log(chalk.grey("When you are ready, you can publish with the following command"));
        console.log(chalk.green(`datapm publish ${packageFileLocation}`));
        process.exit(0);
    }

    // For PackageFileWithContext that includes a registryUrl, publish the package
    await publishPackage({ reference: packageFileLocation, defaults: argv.defaults });

    process.exit(0);
}

function validUrl(value: string): boolean | string {
    if (value === "") return true;

    if (!value.startsWith("http://") && !value.startsWith("https://")) {
        return "Must start with http:// or https://";
    }

    if (value.length < 10) {
        return "Not a valid URL - not long enough";
    }

    return true;
}

function validSampleRecordCount(value: number): boolean | string {
    if (value == null) return "Number, 0 to 100, required";
    if (value > 100) return "Number less than 100 required";
    return true;
}
