import chalk from "chalk";
import {
    comparePackages,
    diffCompatibility,
    nextVersion as getNextVersion,
    PackageFile,
    Properties,
    Schema
} from "datapm-lib";
import { JSONSchema7TypeName } from "json-schema";
import ora from "ora";
import prompts, { Choice } from "prompts";
import { SemVer } from "semver";
import { Permission } from "../generated/graphql";
import { validPackageDisplayName, validShortPackageDescription, validUnit, validVersion } from "../util/IdentifierUtil";
import { getPackage, RegistryPackageFileContext } from "../util/PackageAccessUtil";
import clone from "rfdc";
import { EditArguments } from "./EditCommand";
import { defaultPromptOptions } from "../util/parameters/DefaultParameterOptions";
import { checkPackagePermissionsOnRegistry } from "../util/RegistryPermissions";
import * as SchemaUtil from "../util/SchemaUtil";

async function schemaPrompts(schema: Schema): Promise<void> {
    if (schema.properties == null) return;

    const currentExcludedAttributes = Object.keys(schema.properties).flatMap((key) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const p = schema.properties![key];
        if (p.hidden) return key;
        else return [];
    });

    const ignoreAttributesChoices = [
        {
            title: "Yes",
            value: true
        },
        {
            title: "No",
            value: false
        }
    ];

    if (currentExcludedAttributes.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        ignoreAttributesChoices.push(ignoreAttributesChoices.shift()!);
    }

    const ignoreAttributesResponse = await prompts(
        [
            {
                type: "autocomplete",
                name: "ignoreAttributes",
                message: "Exclude any attributes?",
                choices: ignoreAttributesChoices
            }
        ],
        defaultPromptOptions
    );
    if (ignoreAttributesResponse.ignoreAttributes === true) {
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

    const renameAttributesChoices = [
        {
            title: "Yes",
            value: true
        },
        {
            title: "No",
            value: false
        }
    ];

    if (currentRenamedAttributes.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        renameAttributesChoices.push(renameAttributesChoices.shift()!);
    }

    // Rename Attributes
    const renameAttributesResponse = await prompts(
        [
            {
                type: "autocomplete",
                name: "renameAttributes",
                message: "Rename attributes?",
                choices: renameAttributesChoices
            }
        ],
        defaultPromptOptions
    );

    if (renameAttributesResponse.renameAttributes === true) {
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
                    type: "autocomplete",
                    name: "confirm",
                    message: `Do you want to edit units for the ${keys.length} number properties?`,
                    choices: [
                        {
                            title: "No",
                            value: false,
                            selected: true
                        },
                        {
                            title: "Yes",
                            value: true
                        }
                    ]
                }
            ],
            defaultPromptOptions
        );
        if (confirmContinueResponse.confirm === true) {
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

export async function editPackage(argv: EditArguments): Promise<void> {
    const oraRef: ora.Ora = ora({
        color: "yellow",
        spinner: "dots"
    });

    if (argv.reference == null) {
        const referencePromptResult = await prompts(
            {
                type: "text",
                name: "reference",
                message: "What is the package name, url, or file name?",
                validate: (value) => {
                    if (!value) return "Package file name or url required";
                    return true;
                }
            },
            defaultPromptOptions
        );
        argv.reference = referencePromptResult.reference;
    }

    if (argv.reference == null) throw new Error("Package reference, file, or URL is required");

    // Finding package
    oraRef.start("Finding package...");

    const packageFileWithContext = await getPackage(argv.reference, "canonicalIfAvailable").catch((error) => {
        oraRef.fail();
        console.log(chalk.red(error.message));
        process.exit(1);
    });

    if (packageFileWithContext.contextType === "registry") {
        const registryPackageFileContext = packageFileWithContext as RegistryPackageFileContext;

        try {
            await checkPackagePermissionsOnRegistry(
                {
                    catalogSlug: packageFileWithContext.catalogSlug as string,
                    packageSlug: packageFileWithContext.packageFile.packageSlug
                },
                registryPackageFileContext.registryUrl,
                Permission.EDIT
            );
        } catch (error) {
            if (error.message === "NOT_AUTHORIZED") {
                oraRef.fail(
                    "You do not have permission to edit this package. Contact the package manager to request edit permission"
                );
                process.exit(1);
            } else if (error.message === "NOT_AUTHENTICATED") {
                oraRef.fail("You are not logged in to the registry. Use the following command to login");
                console.log(chalk.green("datapm registry login " + registryPackageFileContext.registryUrl));
                process.exit(1);
            }

            oraRef.fail("There was an error checking package permissions: " + error.message);
            process.exit(1);
        }
    }

    const oldPackageFile = packageFileWithContext.packageFile;
    oraRef.succeed();

    if (!packageFileWithContext.permitsSaving) {
        oraRef.fail("Packages can not be saved to " + packageFileWithContext.contextType);
        process.exit(1);
    }

    if (!packageFileWithContext.hasPermissionToSave) {
        oraRef.fail(
            "You do not have permission to save to " + packageFileWithContext.packageFileUrl.replace("file://", "")
        );
        process.exit(1);
    }

    if (packageFileWithContext.packageFile.canonical === false) {
        oraRef.fail("Package is not canonical. It has been modified for security or convenience reasons.");

        if (packageFileWithContext.packageFile.modifiedProperties !== undefined) {
            oraRef.info(
                "Modified properties include: " + packageFileWithContext.packageFile.modifiedProperties.join(", ")
            );

            oraRef.info("Use the original package file, or contact the package author.");
        }
        process.exit(1);
    }

    let newPackageFile: PackageFile = clone()(oldPackageFile);

    console.log("");
    console.log(chalk.magenta("Inspection Result"));
    console.log(`${chalk.gray("Package slug: ")} ${chalk.yellow(oldPackageFile.packageSlug)}`);
    console.log(`${chalk.gray("Existing package description: ")} ${chalk.yellow(oldPackageFile.description)}`);
    console.log(`${chalk.gray("Last updated date: ")} ${chalk.yellow(oldPackageFile.updatedDate)}`);

    console.log("");
    console.log(chalk.magenta("Schema Refinement"));

    for (const schema of newPackageFile.schemas) {
        SchemaUtil.print(schema);

        await schemaPrompts(schema);
    }

    const differences = comparePackages(oldPackageFile, newPackageFile);

    console.log("");
    console.log(chalk.magenta("Package Detail"));
    // Get next version
    const nextVersion = getNextVersion(new SemVer(oldPackageFile.version), diffCompatibility(differences)).version;

    const displayNameResponse = await prompts(
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

    const defaultSampleRecordCount = Math.min(
        ...newPackageFile.schemas.map((schema: Schema) => schema.sampleRecords?.length as number)
    );

    const promptResponses = {
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

    await packageFileWithContext.save(oraRef, newPackageFile);

    if (packageFileWithContext.contextType === "localFile") {
        console.log("");
        console.log(chalk.grey("When you are ready, you can publish with the following command"));
        console.log(chalk.green(`datapm publish ${packageFileWithContext.packageFileUrl.replace("file://", "")}`));
        process.exit(0);
    }

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
