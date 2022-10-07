import chalk from "chalk";
import {
    comparePackages,
    diffCompatibility,
    nextVersion,
    PackageFile,
    Schema,
    StreamSet,
    ParameterType,
    UpdateMethod
} from "datapm-lib";
import { PackageIdentifier } from "../generated/graphql";
import { PackageFileWithContext, cantSaveReasonToString, CantSaveReasons } from "../util/PackageContext";
import { Job, JobResult } from "./Task";
import { JobContext } from "./JobContext";
import clone from "rfdc";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
import { getSourceByType } from "../connector/SourceUtil";
import { obtainConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { differenceToString } from "../util/PackageUtil";
import { SemVer } from "semver";
import { filterBadSchemaProperties, inspectSource, inspectStreamSet } from "./PackageJob";
import { combineSchema, combineSchemas } from "../util/SchemaUtil";

export class UpdateArguments {
    reference?: string | PackageIdentifier;
    defaults?: boolean;
    forceUpdate?: boolean;
    inspectionSeconds?: number;
}

export class UpdatePackageJob extends Job<PackageFileWithContext> {
    constructor(private jobContext: JobContext, private argv: UpdateArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<PackageFileWithContext>> {
        let packageString = this.argv.reference as string;
        if (this.argv.reference && typeof this.argv.reference !== "string") {
            const packageIdentifier = this.argv.reference;
            packageString = packageIdentifier.catalogSlug + "/" + packageIdentifier.packageSlug;
        }

        this.jobContext.log("INFO", "Started package update job for " + packageString);
        if (this.argv.reference == null) {
            const referencePromptResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "reference",
                    configuration: {},
                    message: "What is the package name, url, or file name?",
                    validate: (value) => {
                        if (!value) return "Package file name or url required";
                        return true;
                    }
                }
            ]);

            this.argv.reference = referencePromptResult.reference;
        }

        if (this.argv.reference == null) throw new Error("Package file or URL is required");

        // Finding package
        let task = await this.jobContext.startTask("Finding package file...");

        let packageFileWithContext: PackageFileWithContext;

        try {
            packageFileWithContext = await this.jobContext.getPackageFile(this.argv.reference, "canonicalIfAvailable"); // getPackage(this.jobContext, this.argv.reference, "canonicalIfAvailable");
        } catch (error) {
            await task.end("ERROR", error.message, error);
            return {
                exitCode: 1
            };
        }

        await task.end("SUCCESS", "Found package file: " + packageFileWithContext.packageReference);

        task = await this.jobContext.startTask("Checking edit permissions...");

        const oldPackageFile = packageFileWithContext.packageFile;

        if (!packageFileWithContext.permitsSaving) {
            await task.end("ERROR", "Packages can not be saved to " + packageFileWithContext.contextType);
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

        await task.end("SUCCESS", "Edit permission found");

        task = await this.jobContext.startTask("Checking package is canonical...");
        if (packageFileWithContext.packageFile.canonical === false) {
            await task.end(
                "ERROR",
                "Package is not canonical. It has been modified for security or convenience reasons."
            );

            if (packageFileWithContext.packageFile.modifiedProperties !== undefined) {
                this.jobContext.print(
                    "INFO",
                    "Modified properties include: " + packageFileWithContext.packageFile.modifiedProperties.join(", ")
                );

                this.jobContext.print("INFO", "Use the original package file, or contact the package author.");
            }
            return {
                exitCode: 1
            };
        }

        await task.end("SUCCESS", "Package is canonical");

        let newPackageFile: PackageFile = clone()(oldPackageFile);
        newPackageFile.schemas = [];
        newPackageFile.sources = [];

        for (const sourceObject of oldPackageFile.sources) {
            const connectorDescription = getConnectorDescriptionByType(sourceObject.type);

            if (connectorDescription == null) {
                this.jobContext.print("FAIL", "No connector found to inspect this data - " + sourceObject.type);
                return {
                    exitCode: 1
                };
            }

            const connector = await connectorDescription.getConnector();

            const sourceDescription = getSourceByType(sourceObject.type);
            const source = await (await sourceDescription)?.getSource();

            if (source == null) {
                this.jobContext.print(
                    "FAIL",
                    "No source implementation found to inspect this data - " + sourceObject.type
                );
                return {
                    exitCode: 1
                };
            }

            const connectionConfigurationResults = await obtainConnectionConfiguration(
                this.jobContext,
                packageFileWithContext.catalogSlug
                    ? {
                          catalogSlug: packageFileWithContext.catalogSlug,
                          packageSlug: packageFileWithContext.packageFile.packageSlug
                      }
                    : undefined,
                connector,
                sourceObject.connectionConfiguration,
                undefined,
                this.argv.defaults
            );

            if (connectionConfigurationResults === false) {
                return {
                    exitCode: 1
                };
            }
            const connectionConfiguration = connectionConfigurationResults.connectionConfiguration;
            sourceObject.connectionConfiguration = connectionConfiguration;

            const repositoryIdentifier = await connector.getRepositoryIdentifierFromConfiguration(
                connectionConfiguration
            );

            let credentialsConfiguration = {};

            if (sourceObject.credentialsIdentifier) {
                try {
                    credentialsConfiguration =
                        (await this.jobContext.getRepositoryCredential(
                            packageFileWithContext.catalogSlug
                                ? {
                                      catalogSlug: packageFileWithContext.catalogSlug,
                                      packageSlug: packageFileWithContext.packageFile.packageSlug
                                  }
                                : undefined,
                            connector.getType(),
                            repositoryIdentifier,
                            sourceObject.credentialsIdentifier
                        )) ?? {};
                } catch (error) {
                    this.jobContext.print(
                        "ERROR",
                        "The credential " + sourceObject.credentialsIdentifier + " could not be found or read."
                    );
                }
            }

            const credentialsConfigurationResults = await obtainCredentialsConfiguration(
                this.jobContext,
                packageFileWithContext.catalogSlug
                    ? {
                          catalogSlug: packageFileWithContext.catalogSlug,
                          packageSlug: packageFileWithContext.packageFile.packageSlug
                      }
                    : undefined,
                connector,
                connectionConfiguration,
                credentialsConfiguration,
                false,
                sourceObject.credentialsIdentifier,
                this.argv.defaults
            );

            if (credentialsConfigurationResults === false) {
                return {
                    exitCode: 1
                };
            }

            credentialsConfiguration = credentialsConfigurationResults.credentialsConfiguration;

            if (connector.requiresCredentialsConfiguration()) {
                sourceObject.credentialsIdentifier = await connector.getCredentialsIdentifierFromConfiguration(
                    connectionConfiguration,
                    credentialsConfiguration
                );
            }

            // UpdateJob uses sourceObject.updateConfiguration to provide
            // "defaults" for packges that require user input during fetch
            const sourceConfiguration = {
                ...(sourceObject.configuration || {}),
                ...(sourceObject.updateConfiguration || {})
            };

            const uriInspectionResults = await inspectSource(
                source,
                this.jobContext,
                sourceObject.connectionConfiguration,
                credentialsConfiguration,
                sourceConfiguration
            );

            sourceObject.configuration = sourceConfiguration;

            const streamSets: StreamSet[] = [];
            for (const streamSet of uriInspectionResults.streamSetPreviews) {
                const streamInspectionResult = await inspectStreamSet(
                    sourceObject,
                    streamSet,
                    this.jobContext,
                    sourceConfiguration,
                    this.argv.inspectionSeconds || 30
                );

                newPackageFile.schemas = combineSchemas(newPackageFile.schemas, streamInspectionResult.schemas);

                streamSets.push({
                    schemaTitles: streamInspectionResult.schemas.map((s: Schema) => s.title as string),
                    slug: streamSet.slug,
                    streamStats: streamInspectionResult.streamStats,
                    lastUpdateHash: streamSet.updateHash,
                    updateMethods: streamInspectionResult.updateMethods,
                    endReached: streamInspectionResult.endReached
                });
            }

            // remove the updateConfiguration related keys, and save the remaining to the source
            for (const updateOnlyKey of Object.keys(sourceObject.updateConfiguration || {})) {
                delete sourceConfiguration[updateOnlyKey];
            }

            newPackageFile.sources.push({
                ...sourceObject,
                streamSets: streamSets
            });
        }

        for (const newSchema of newPackageFile.schemas) {
            newSchema.properties = filterBadSchemaProperties(newSchema);
        }

        // Apply user defined attributes to new schemas
        const finalSchemas: Schema[] = [];

        for (const oldSchema of oldPackageFile.schemas) {
            const newSchema = newPackageFile.schemas.find((s) => s.title === oldSchema.title);

            if (newSchema == null) {
                continue;

                // TODO This means schemas not seen during inspection will be dropped
                // and this is a breaking change to the schema.
                // There may be sources that don't always produce every schema every time
                // But how to control for that?
            }

            if (newSchema.updateMethods?.includes(UpdateMethod.CONTINUOUS)) {
                const combinedSchema = combineSchema(oldSchema, newSchema);

                finalSchemas.push(combinedSchema);
            } else {
                newSchema.hidden = oldSchema.hidden;
                newSchema.description = oldSchema.description;
                newSchema.unit = oldSchema.unit;
                newSchema.derivedFrom = oldSchema.derivedFrom;
                newSchema.derivedFromDescription = oldSchema.derivedFromDescription;
                finalSchemas.push(newSchema);
            }
        }

        // Show the user the package information

        this.jobContext.print("NONE", "");
        this.jobContext.print("NONE", chalk.magenta("Inspection Result"));
        this.jobContext.print("NONE", `${chalk.gray("Package slug: ")} ${chalk.yellow(oldPackageFile.packageSlug)}`);
        this.jobContext.print(
            "NONE",
            `${chalk.gray("Existing package description: ")} ${chalk.yellow(oldPackageFile.description)}`
        );
        this.jobContext.print(
            "NONE",
            `${chalk.gray("Last updated date: ")} ${chalk.yellow(oldPackageFile.updatedDate)}`
        );

        let differences = comparePackages(oldPackageFile, newPackageFile);
        if (differences.length === 0) {
            this.jobContext.print("NONE", "No differences found");
        } else {
            this.jobContext.print("NONE", `Found ${differences.length} differences`);
        }
        differences.forEach((difference) => {
            this.jobContext.print("NONE", chalk.yellow(differenceToString(difference)));
        });

        this.jobContext.print("NONE", "");
        this.jobContext.print("NONE", chalk.magenta("Upload"));

        differences = comparePackages(oldPackageFile, newPackageFile);

        const compatibility = diffCompatibility(differences);

        const lastestVersionSemVer = new SemVer(oldPackageFile.version);

        const minNextVersion = nextVersion(lastestVersionSemVer, compatibility);

        newPackageFile = {
            ...newPackageFile,
            updatedDate: new Date(),
            version: minNextVersion.format()
        };

        await packageFileWithContext.save(newPackageFile);

        return {
            exitCode: 0,
            result: packageFileWithContext
        };
    }
}
