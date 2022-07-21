import chalk from "chalk";
import { PackageFile, PublishMethod, RegistryReference, ParameterOption, ParameterType } from "datapm-lib";
import { Catalog } from "../generated/graphql";
import { RegistryPackageFileContext, cantSaveReasonToString, CantSaveReasons } from "../util/PackageContext";
import { publishPackageFile } from "../util/PackageUtil";
import { getRegistryClientWithConfig } from "../util/RegistryClient";
import { Job, JobResult } from "./Task";
import { JobContext } from "./JobContext";
import { RegistryConfig } from "../config/Config";

export class PublishJobResult {
    targetRegistries: RegistryReference[];
    packageFile: PackageFile;
}

export class PublishJobArguments {
    defaults?: boolean;
    reference?: string;
}

export class PublishJob extends Job<PublishJobResult> {
    constructor(private jobContext: JobContext, private args: PublishJobArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<PublishJobResult>> {
        if (this.args.reference == null) {
            const referencePromptResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    configuration: {},
                    name: "reference",
                    message: "What is the package name, url, or file name?",
                    validate: (value) => {
                        if (!value) return "Package file name or url required";
                        return true;
                    }
                }
            ]);
            this.args.reference = referencePromptResult.reference;
        }

        if (this.args.reference == null) {
            this.jobContext.print("ERROR", "No package reference provided");
            return {
                exitCode: 1
            };
        }

        let task = await this.jobContext.startTask(`Resolving package file reference: ${this.args.reference}`);

        let packageFileWithContext;
        try {
            packageFileWithContext = await this.jobContext.getPackageFile(this.args.reference, "canonicalIfAvailable");
        } catch (error) {
            await task.end("ERROR", error.message);
            return {
                exitCode: 1
            };
        }

        const packageFile = packageFileWithContext.packageFile;

        if (packageFile.canonical === false) {
            await task.end(
                "ERROR",
                "Package file is not canonical. This means it is a copy modified for security or convenience reasons."
            );
            this.jobContext.print(
                "NONE",
                chalk.yellow("Use a canonical (original) package file, or contact the package file author.")
            );
            return {
                exitCode: 1
            };
        }

        await task.end(
            "SUCCESS",
            `Found target package file: ${packageFileWithContext.packageReference.replace("file://", "")}`
        );

        this.jobContext.setCurrentStep("Publishing Options");

        if (!packageFile.registries || packageFile.registries.length === 0) {
            if (this.args.defaults) {
                this.jobContext.print("ERROR", "Package file has no registries defined. Can not use --defaults option");
                return {
                    exitCode: 1
                };
            }
        }

        let targetRegistries: RegistryReference[] = [];

        let contextRegistryReference: RegistryReference | undefined;

        if (packageFileWithContext.contextType === "registry") {
            const registryPacakgeFileContext = packageFileWithContext as RegistryPackageFileContext;
            contextRegistryReference = packageFile.registries?.find(
                (u) => u.url === registryPacakgeFileContext.registryUrl
            );
        }

        if (this.args.defaults) {
            if (contextRegistryReference) {
                targetRegistries = [contextRegistryReference];
            } else {
                targetRegistries = packageFile.registries || [];
            }

            if (targetRegistries.length === 0) {
                this.jobContext.print("ERROR", "Package file has no registries defined. Can not use --defaults option");
                return {
                    exitCode: 1
                };
            }
        } else if (contextRegistryReference) {
            const promptResponse = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    message:
                        "Publish to " +
                        contextRegistryReference.url +
                        "/" +
                        contextRegistryReference.catalogSlug +
                        "/" +
                        packageFileWithContext.packageFile.packageSlug,
                    name: "confirm",
                    configuration: {},
                    options: [
                        {
                            title: "Yes",
                            value: "true"
                        },
                        {
                            title: "No",
                            value: "false"
                        }
                    ]
                }
            ]);

            if (promptResponse.confirm === "false") {
                targetRegistries = [];
            } else {
                targetRegistries = [contextRegistryReference];
            }
        } else if (packageFile.registries && packageFile.registries.length > 0) {
            const promptResponse = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    message: "Publish to " + packageFile.registries.map((r) => r.url).join(", ") + "?",
                    name: "confirm",
                    configuration: {},
                    options: [
                        {
                            title: "Yes, Continue",
                            value: "true"
                        },
                        {
                            title: "No, Choose A Different Registry",
                            value: "false"
                        }
                    ]
                }
            ]);

            if (promptResponse.confirm === "false") {
                targetRegistries = [];
            } else {
                targetRegistries = packageFile.registries;
            }
        }

        if (targetRegistries.length === 0) {
            const registries: RegistryConfig[] = this.jobContext
                .getRegistryConfigs()
                .filter((registry: RegistryConfig) => !!registry.apiKey);
            if (registries.length === 0) {
                this.jobContext.print(
                    "NONE",
                    chalk.yellow(
                        "You have not logged into a registry from the command line. Use the command below to login."
                    ) +
                        "\n" +
                        chalk.green("datapm registry login")
                );
                return {
                    exitCode: 1
                };
            }

            const targetRegistryActionResponse = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    name: "targetRegistry",
                    message: "Target registry?",
                    configuration: {},
                    options: registries.map((registry: RegistryConfig) => ({
                        title: registry.url,
                        value: registry.url
                    }))
                }
            ]);

            task = await this.jobContext.startTask("Fetching catalogs from registry...");
            const registry = getRegistryClientWithConfig(this.jobContext, {
                url: targetRegistryActionResponse.targetRegistry
            });

            let registryCatalogSlugs;
            try {
                const result = await registry.getCatalogs();
                registryCatalogSlugs = result.data.myCatalogs
                    .map((catalog: Catalog) => catalog.identifier.catalogSlug as string)
                    .sort((a, b) => a.localeCompare(b));
                await task.end("SUCCESS", "Fetched catalogs from registry");
            } catch (error) {
                await task.end("ERROR", "Failed to fetch catalogs");
                if (error?.message != null) console.error(error.message);
                throw error;
            }

            const packageFileRegistryReferences = (packageFile.registries || []).filter(
                (registry: RegistryReference) => registry.url === targetRegistryActionResponse.targetRegistry
            );

            const catalogSlugActionResponse = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    name: "catalogSlug",
                    message: "Catalog short name?",
                    configuration: {},
                    options: (registryCatalogSlugs || []).map((catalogSlug: string) => ({
                        title: catalogSlug,
                        value: catalogSlug,
                        selected:
                            packageFileRegistryReferences.length > 0 &&
                            packageFileRegistryReferences[0].catalogSlug === catalogSlug
                    }))
                }
            ]);

            const publishMethod = await this.obtainPublishMethod(packageFile, PublishMethod.SCHEMA_ONLY);

            const chosenRegistry = {
                url: targetRegistryActionResponse.targetRegistry,
                catalogSlug: catalogSlugActionResponse.catalogSlug,
                publishMethod: publishMethod
            };

            packageFile.registries =
                packageFile.registries == null
                    ? [chosenRegistry]
                    : [
                          ...packageFile.registries.filter(
                              (r) =>
                                  !(
                                      r.url.toLowerCase() === chosenRegistry.url.toLowerCase() &&
                                      r.catalogSlug.toLowerCase() === chosenRegistry.catalogSlug.toLowerCase()
                                  )
                          ),
                          chosenRegistry
                      ];

            targetRegistries.push(chosenRegistry);
        }

        this.jobContext.setCurrentStep("Publish Schema to Registry");

        // Update package file with selected registries
        for (const targetRegistry of targetRegistries) {
            const existingTargetRegistry = packageFile.registries?.find(
                (s) =>
                    s.url.toLowerCase() === targetRegistry.url.toLowerCase() &&
                    s.catalogSlug.toLowerCase() === targetRegistry.catalogSlug.toLowerCase()
            );

            if (existingTargetRegistry) {
                existingTargetRegistry.publishMethod = targetRegistry.publishMethod;
            } else {
                packageFile.registries = packageFile.registries
                    ? [...packageFile.registries, targetRegistry]
                    : [targetRegistry];
            }
        }

        await publishPackageFile(this.jobContext, packageFileWithContext, targetRegistries);

        if (packageFileWithContext.permitsSaving && packageFileWithContext.hasPermissionToSave) {
            await packageFileWithContext.save(packageFile);
        } else {
            this.jobContext.print(
                "ERROR",
                cantSaveReasonToString(packageFileWithContext.cantSaveReason as CantSaveReasons)
            );
            return {
                exitCode: 1
            };
        }

        return {
            exitCode: 0,
            result: {
                targetRegistries,
                packageFile
            }
        };
    }

    async obtainPublishMethod(packageFile: PackageFile, defaultValue: PublishMethod): Promise<PublishMethod> {
        // Detemine if any of the packageFile sources require credentials

        while (true) {
            const choices: ParameterOption[] = [
                {
                    title: "Publish schema, client direct connects for data",
                    selected: defaultValue === PublishMethod.SCHEMA_ONLY,
                    value: PublishMethod.SCHEMA_ONLY
                } /*,
                {
                    title: "Publish schema, proxy data through registry",
                    selected: defaultValue === PublishMethod.SCHEMA_PROXY_DATA,
                    value: PublishMethod.SCHEMA_PROXY_DATA
                } */,
                {
                    title: "Publish schema and data to registry",
                    selected: defaultValue === PublishMethod.SCHEMA_AND_DATA,
                    value: PublishMethod.SCHEMA_AND_DATA
                }
            ];

            // prompt the user whether they want to publish a proxied file or not
            const publishTypeSelection = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    name: "method",
                    message: "Data Access Method?",
                    configuration: {},
                    options: choices
                }
            ]);

            this.jobContext.print("NONE", "");
            if (publishTypeSelection.method === PublishMethod.SCHEMA_ONLY) {
                if (packageFile.sources.find((s) => s.credentialsIdentifier !== undefined) !== undefined) {
                    // Credentials are required, so tell the user they will have to enter
                    this.jobContext.print("INFO", "Access to this data requires credentials.");
                    this.jobContext.print(
                        "INFO",
                        "You will need to share the access credentials with the users of this package manually."
                    );

                    this.jobContext.print(
                        "INFO",
                        " Or they will need to obtain their own access credentials to the data source(s) for this package"
                    );

                    this.jobContext.print(
                        "WARN",
                        "The access credentials you used to connect will be published to the server, so that it can perform periodic refreshes of the data package. These credentials will not be made available to other users."
                    );

                    break;
                } else {
                    this.jobContext.print(
                        "INFO",
                        "The package will be published to the registry, and consumers will access the data directly."
                    );
                    this.jobContext.print("INFO", "This requires direct connectivity from the client.");
                }

                this.jobContext.print("NONE", "");
                const confirmAccessRequirements = await this.jobContext.parameterPrompt([
                    {
                        name: "confirmed",
                        type: ParameterType.AutoComplete,
                        message: "Is the above ok?",
                        configuration: {},
                        options: [
                            {
                                title: "Yes",
                                value: "yes"
                            },
                            {
                                title: "No",
                                value: "no"
                            }
                        ]
                    }
                ]);

                if (confirmAccessRequirements.confirmed === "no") {
                    continue;
                }

                return PublishMethod.SCHEMA_ONLY;
            }

            if (publishTypeSelection.method === PublishMethod.SCHEMA_AND_DATA) {
                this.jobContext.print("INFO", "The data in this package will be copied to the registry.");
                this.jobContext.print(
                    "INFO",
                    "Consumers will not receive data updates until you run the 'datapm update' command on this package."
                );
                this.jobContext.print("NONE", "");
                const confirmDatacopy = await this.jobContext.parameterPrompt([
                    {
                        type: ParameterType.AutoComplete,
                        name: "confirmed",
                        message: "Is the above ok?",
                        configuration: {},
                        options: [
                            {
                                title: "Yes",
                                value: "yes"
                            },
                            {
                                title: "No",
                                value: "no"
                            }
                        ]
                    }
                ]);
                if (confirmDatacopy.confirmed === "no") {
                    continue;
                }

                return PublishMethod.SCHEMA_AND_DATA;
            }

            if (publishTypeSelection.method === PublishMethod.SCHEMA_PROXY_DATA) {
                if (packageFile.sources.find((s) => s.credentialsIdentifier !== undefined) !== undefined) {
                    this.jobContext.print("INFO", "The registry will act as a proxy for this data.");

                    this.jobContext.print(
                        "INFO",
                        "Therefore you must provide the registry with access credentials for the data."
                    );
                    this.jobContext.print(
                        "WARN",
                        "For best security practices, you should supply credentials with limited read-only access as necessary to consume the required data."
                    );

                    this.jobContext.print("NONE", "");
                    const confirmProxy = await this.jobContext.parameterPrompt([
                        {
                            type: ParameterType.AutoComplete,
                            name: "confirmed",
                            configuration: {},
                            message: "Is the above ok?",
                            options: [
                                {
                                    title: "Yes",
                                    value: "yes"
                                },
                                {
                                    title: "No",
                                    value: "no"
                                }
                            ]
                        }
                    ]);

                    if (confirmProxy.confirmed === "no") {
                        continue;
                    }

                    return PublishMethod.SCHEMA_PROXY_DATA;
                }
            }
        }

        return PublishMethod.SCHEMA_ONLY; // Never actually called
    }
}
