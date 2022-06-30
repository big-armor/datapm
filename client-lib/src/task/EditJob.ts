import { Job, JobResult } from "./Task";
import { JobContext } from "./JobContext";
import {
    comparePackages,
    diffCompatibility,
    PackageFile,
    Properties,
    Schema,
    nextVersion as getNextVersion,
    ParameterOption,
    ParameterType
} from "datapm-lib";
import { validPackageDisplayName, validShortPackageDescription, validUnit, validVersion } from "../util/IdentifierUtil";
import { PackageFileWithContext, cantSaveReasonToString, CantSaveReasons } from "../util/PackageContext";
import chalk from "chalk";
import { SemVer } from "semver";
import clone from "rfdc";
import * as SchemaUtil from "../util/SchemaUtil";

export class EditJobResult {
    packageFileWithContext: PackageFileWithContext;
}
export class EditJobArguments {
    reference?: string;
}

export class EditJob extends Job<EditJobResult> {
    constructor(private jobContext: JobContext, private args: EditJobArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<EditJobResult>> {
        if (this.args.reference == null) {
            const referencePromptResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "reference",
                    message: "What is the package name, url, or file name?",
                    configuration: {},
                    validate: (value) => {
                        if (!value) return "Package file name or url required";
                        return true;
                    }
                }
            ]);
            this.args.reference = referencePromptResult.reference;
        }

        if (this.args.reference == null) throw new Error("Package reference, file, or URL is required");

        // Finding package
        let task = await this.jobContext.startTask("Finding package...");

        let packageFileWithContext: PackageFileWithContext;

        try {
            packageFileWithContext = await this.jobContext.getPackageFile(this.args.reference, "canonicalIfAvailable");
        } catch (error) {
            await task.end("ERROR", error.message);
            return {
                exitCode: 1
            };
        }

        await task.end("SUCCESS", "Found package file");

        task = await this.jobContext.startTask("Checking permissions...");

        const oldPackageFile = packageFileWithContext.packageFile;

        if (!packageFileWithContext.permitsSaving) {
            task.end("ERROR", "Packages can not be saved when referenced via " + packageFileWithContext.contextType);
            this.jobContext.print(
                "NONE",
                "Download the package file and use the edit command locally, or reference the package via the package url"
            );
            return {
                exitCode: 1
            };
        }

        if (!packageFileWithContext.hasPermissionToSave) {
            await task.end("ERROR", cantSaveReasonToString(packageFileWithContext.cantSaveReason as CantSaveReasons));
            return {
                exitCode: 1
            };
        }

        task.end("SUCCESS", "You have edit permission");

        task = await this.jobContext.startTask("Checking package is cononical...");

        if (packageFileWithContext.packageFile.canonical === false) {
            await task.end(
                "ERROR",
                "Package is not canonical. It has been modified for security or convenience reasons."
            );

            if (packageFileWithContext.packageFile.modifiedProperties !== undefined) {
                await task.end(
                    "ERROR",
                    "Modified properties include: " + packageFileWithContext.packageFile.modifiedProperties.join(", ")
                );

                this.jobContext.print("NONE", "Use the original package file, or contact the package author.");
            }
            return {
                exitCode: 1
            };
        }

        task.end("SUCCESS", "Package is canonical");

        let newPackageFile: PackageFile = clone()(oldPackageFile);

        this.jobContext.setCurrentStep("Current Package Details");
        this.jobContext.print("NONE", `${chalk.gray("Package slug: ")} ${chalk.yellow(oldPackageFile.packageSlug)}`);
        this.jobContext.print(
            "NONE",
            `${chalk.gray("Existing package description: ")} ${chalk.yellow(oldPackageFile.description)}`
        );
        this.jobContext.print(
            "NONE",
            `${chalk.gray("Last updated date: ")} ${chalk.yellow(oldPackageFile.updatedDate)}`
        );

        for (const schema of newPackageFile.schemas) {
            this.jobContext.setCurrentStep(chalk.magenta(schema.title + " Schema Options"));

            SchemaUtil.printSchema(this.jobContext, schema);

            await schemaPrompts(this.jobContext, schema);
        }

        const differences = comparePackages(oldPackageFile, newPackageFile);

        this.jobContext.setCurrentStep(chalk.magenta("Package Detail"));
        // Get next version
        const nextVersion = getNextVersion(new SemVer(oldPackageFile.version), diffCompatibility(differences)).version;

        const displayNameResponse = await this.jobContext.parameterPrompt([
            {
                type: ParameterType.Text,
                name: "displayName",
                message: "User friendly package name?",
                defaultValue: oldPackageFile.displayName,
                validate: validPackageDisplayName,
                configuration: {}
            }
        ]);

        const defaultSampleRecordCount = Math.min(
            ...newPackageFile.schemas.map((schema: Schema) => schema.sampleRecords?.length as number)
        );

        const promptResponses = {
            packageSlug: oldPackageFile.packageSlug,
            ...(await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "version",
                    message: "Next version?",
                    defaultValue: nextVersion,
                    validate: validVersion,
                    configuration: {}
                },
                {
                    type: ParameterType.Text,
                    name: "description",
                    message: "Short package description?",
                    defaultValue: oldPackageFile.description,
                    validate: validShortPackageDescription,
                    configuration: {}
                },
                {
                    type: ParameterType.Text,
                    name: "website",
                    message: "Website?",
                    defaultValue: oldPackageFile.website,
                    validate: validUrl,
                    configuration: {}
                },
                {
                    type: ParameterType.Number,
                    name: "sampleRecordCount",
                    message: "Number of sample records?",
                    defaultValue: defaultSampleRecordCount,
                    numberMinimumValue: 0,
                    numberMaximumValue: 100,
                    configuration: {}
                }
            ]))
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

        await packageFileWithContext.save(newPackageFile);

        return {
            exitCode: 0,
            result: {
                packageFileWithContext
            }
        };
    }
}

async function schemaPrompts(jobContext: JobContext, schema: Schema): Promise<void> {
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

    const ignoreAttributesResponse = await jobContext.parameterPrompt([
        {
            type: ParameterType.AutoComplete,
            name: "ignoreAttributes",
            configuration: {},
            message: "Exclude any attributes?",
            options: ignoreAttributesChoices
        }
    ]);

    if (ignoreAttributesResponse.ignoreAttributes === true) {
        const attributesToIgnoreResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.MultiSelect,
                name: "attributesToIgnore",
                configuration: {},
                message: "Attributes to exclude?",
                options: Object.keys(schema.properties).map<ParameterOption>((attributeName) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const title = schema.properties![attributeName].title!;

                    return {
                        title,
                        value: attributeName,
                        selected: currentExcludedAttributes.includes(attributeName)
                    };
                })
            }
        ]);

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
    const renameAttributesResponse = await jobContext.parameterPrompt([
        {
            type: ParameterType.AutoComplete,
            name: "renameAttributes",
            configuration: {},
            message: "Rename attributes?",
            options: renameAttributesChoices
        }
    ]);

    if (renameAttributesResponse.renameAttributes === true) {
        const attributesToRenameResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.MultiSelect,
                name: "attributesToRename",
                configuration: {},
                message: "Attributes to rename?",
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                options: Object.keys(schema.properties!).map<ParameterOption>((attributeName) => {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const title = schema.properties![attributeName].title!;

                    return {
                        title,
                        value: attributeName,
                        selected: currentRenamedAttributes.includes(attributeName)
                    };
                })
            }
        ]);

        for (const attributeName of attributesToRenameResponse.attributesToRename) {
            let attributeText = attributeName;
            if (schema.properties[attributeName].title !== attributeName) {
                attributeText = `${schema.properties[attributeName].title} [original: ${attributeName}]`;
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const oldAttributeTitle = schema.properties[attributeName].title!;
            const attributeToRenameResponse = await jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "attributeToRename",
                    configuration: {},
                    message: `New attribute name for "${attributeText}"?`,
                    defaultValue: (schema.properties[attributeName].title || "") as string
                }
            ]);
            schema.properties[attributeName].title = attributeToRenameResponse.attributeToRename;
            if (schema.sampleRecords) {
                schema.sampleRecords.forEach((record) => {
                    record[attributeToRenameResponse.attributeToRename] = record[oldAttributeTitle];
                    delete record[oldAttributeTitle];
                });
            }
        }
    }

    const recordUnitResponse = await jobContext.parameterPrompt([
        {
            type: ParameterType.Text,
            name: "recordUnit",
            message: `What does each ${schema.title} record represent?`,
            defaultValue: schema?.unit,
            validate: validUnit,
            configuration: {}
        }
    ]);
    if (recordUnitResponse.recordUnit) {
        schema.unit = recordUnitResponse.recordUnit;
    }
    // Prompt Column Unit per "number" Type Column
    const properties = schema.properties as Properties;
    const keys = Object.keys(properties).filter((key) => {
        const property = properties[key];
        const types = Object.keys(property.types).filter((t) => t != null);
        return types.includes("number") || types.includes("integer");
    });

    if (keys.length > 1) {
        const confirmContinueResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.AutoComplete,
                name: "confirm",
                message: `Do you want to edit units for the ${keys.length} number properties?`,
                configuration: {},
                options: [
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
        ]);
        if (confirmContinueResponse.confirm === true) {
            for (const key of keys) {
                const property = properties[key];
                const columnUnitResponse = await jobContext.parameterPrompt([
                    {
                        type: ParameterType.Text,
                        name: "columnUnit",
                        message: `Unit for attribute '${property.title}'?`,
                        defaultValue: property?.unit,
                        configuration: {},
                        validate: validUnit
                    }
                ]);
                if (columnUnitResponse.columnUnit) {
                    property.unit = columnUnitResponse.columnUnit;
                }
            }
        }
    }
}

function validUrl(value: string[] | string | number | boolean): true | string {
    if (typeof value !== "string") {
        return "Must be a string";
    }

    if (value === "") return true;

    if (!value.startsWith("http://") && !value.startsWith("https://")) {
        return "Must start with http:// or https://";
    }

    if (value.length < 10) {
        return "Not a valid URL - not long enough";
    }

    return true;
}
