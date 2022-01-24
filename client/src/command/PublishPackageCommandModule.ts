import chalk from "chalk";
import { PackageFile, RegistryReference, PublishMethod, DPMConfiguration } from "datapm-lib";
import ora, { Ora } from "ora";
import prompts from "prompts";
import { Catalog, PackageIdentifier } from "../generated/graphql";
import { getRegistryConfigs, RegistryConfig } from "../util/ConfigUtil";
import { identifierToString } from "../util/IdentifierUtil";
import { getPackage, RegistryPackageFileContext } from "../util/PackageAccessUtil";
import { defaultPromptOptions } from "../util/parameters/DefaultParameterOptions";
import { ParameterOption } from "../util/parameters/Parameter";
import { getRegistryClientWithConfig } from "../util/RegistryClient";
import { PublishArguments } from "./PublishPackageCommand";
import { publishPackageFile } from "../util/PackageUtil";

export enum PublishDataSteps {
    STARTING_UPLOAD = "starting_upload",
    UPLOADING_DATA = "uploading_data",
    FINISHED_UPLOAD = "finished_upload"
}

export type CredentialsBySourceSlug = Map<string, DPMConfiguration>;

export class PublishPackageCommandModule {
    async handleCommand(argv: PublishArguments): Promise<void> {
        const oraRef = ora({
            color: "yellow",
            spinner: "dots"
        });

        console.log("");
        console.log(chalk.magenta("Publishing Options"));

        oraRef.start(`Resolving package file reference: ${argv.reference}`);

        const packageFileWithContext = await getPackage(argv.reference, "canonicalIfAvailable").catch((error) => {
            oraRef.fail();
            console.log(chalk.red(error.message));
            process.exit(1);
        });

        const packageFile = packageFileWithContext.packageFile;

        if (packageFile.canonical === false) {
            oraRef.fail(
                "Package file is not canonical. This means it is a copy modified for security or convenience reasons."
            );
            console.log(chalk.yellow("Use a canonical package file, or contact the package file author."));
            process.exit(1);
        }

        oraRef.succeed(`Found target package file: ${packageFileWithContext.packageFileUrl.replace("file://", "")}`);

        if (!packageFile.registries || packageFile.registries.length === 0) {
            if (argv.defaults) {
                console.log("Package file has no registries defined. Can not use --defaults option");
                process.exit(1);
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

        if (argv.defaults) {
            if (contextRegistryReference) {
                targetRegistries = [contextRegistryReference];
            } else {
                targetRegistries = packageFile.registries || [];
            }

            if (targetRegistries.length === 0) {
                oraRef.fail("Package file has no registries defined. Can not use --defaults option");
                process.exit(1);
            }
        } else if (contextRegistryReference) {
            const promptResponse = await prompts(
                [
                    {
                        type: "autocomplete",
                        message:
                            "Publish to " +
                            contextRegistryReference.url +
                            "/" +
                            contextRegistryReference.catalogSlug +
                            "/" +
                            packageFileWithContext.packageFile.packageSlug,
                        name: "confirm",
                        choices: [
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
                ],
                defaultPromptOptions
            );

            if (promptResponse.confirm === "false") {
                targetRegistries = [];
            } else {
                targetRegistries = [contextRegistryReference];
            }
        } else if (packageFile.registries && packageFile.registries.length > 0) {
            const promptResponse = await prompts(
                [
                    {
                        type: "autocomplete",
                        message: "Publish to " + packageFile.registries.map((r) => r.url).join(", ") + "?",
                        name: "confirm",
                        choices: [
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
                ],
                defaultPromptOptions
            );

            if (promptResponse.confirm === "false") {
                targetRegistries = [];
            } else {
                targetRegistries = packageFile.registries;
            }
        }

        if (targetRegistries.length === 0) {
            const registries: RegistryConfig[] = getRegistryConfigs().filter(
                (registry: RegistryConfig) => !!registry.apiKey
            );
            if (registries.length === 0) {
                console.log(
                    chalk.yellow(
                        "You have not logged into a registry from the command line. Use the command below to login."
                    ) +
                        "\n" +
                        chalk.green("datapm registry login")
                );
                process.exit(1);
            }

            const targetRegistryActionResponse = await prompts(
                {
                    type: "autocomplete",
                    name: "targetRegistry",
                    message: "Target registry?",
                    choices: registries.map((registry: RegistryConfig) => ({
                        title: registry.url,
                        value: registry.url
                    }))
                },
                defaultPromptOptions
            );

            oraRef.start("Fetching catalogs from registry...");
            const registry = getRegistryClientWithConfig({
                url: targetRegistryActionResponse.targetRegistry
            });

            let registryCatalogSlugs;
            try {
                const result = await registry.getCatalogs();
                registryCatalogSlugs = result.data.myCatalogs.map(
                    (catalog: Catalog) => catalog.identifier.catalogSlug as string
                );
                oraRef.succeed("Fetched catalogs from registry");
            } catch (error) {
                oraRef.fail("Failed to fetch catalogs");
                if (error?.message != null) console.error(error.message);
                throw error;
            }

            const packageFileRegistryReferences = (packageFile.registries || []).filter(
                (registry: RegistryReference) => registry.url === targetRegistryActionResponse.targetRegistry
            );

            const catalogSlugActionResponse = await prompts(
                {
                    type: "autocomplete",
                    name: "catalogSlug",
                    message: "Catalog short name?",
                    choices: (registryCatalogSlugs || []).map((catalogSlug: string) => ({
                        title: catalogSlug,
                        value: catalogSlug,
                        selected:
                            packageFileRegistryReferences.length > 0 &&
                            packageFileRegistryReferences[0].catalogSlug === catalogSlug
                    }))
                },
                defaultPromptOptions
            );

            const publishMethod = await this.obtainPublishMethod(oraRef, packageFile, PublishMethod.SCHEMA_ONLY);

            const chosenRegistry = {
                url: targetRegistryActionResponse.targetRegistry,
                catalogSlug: catalogSlugActionResponse.catalogSlug,
                publishMethod: publishMethod
            };

            packageFile.registries =
                packageFile.registries == null ? [chosenRegistry] : [...packageFile.registries, chosenRegistry];

            targetRegistries.push(chosenRegistry);
        }

        oraRef.start("Publishing schema...");

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

        if (packageFileWithContext.permitsSaving) {
            if (packageFileWithContext.hasPermissionToSave) {
                await packageFileWithContext.save(oraRef, packageFile);
            } else {
                oraRef.warn(
                    "You do not have edit permissions on the original package file, so these publish settings will not be saved. "
                );
            }
        } else {
            oraRef.warn("Can not save package the original package file, so these publish settings will not be saved.");
            oraRef.warn("Use the new package location for future publishing.");
        }

        await publishPackageFile(oraRef, packageFile, targetRegistries);

        if (targetRegistries.length) {
            const urls = targetRegistries.map((registryRef) => {
                const packageIdentifier: PackageIdentifier = {
                    registryURL: registryRef.url,
                    catalogSlug: registryRef.catalogSlug,
                    packageSlug: packageFile.packageSlug
                };
                return identifierToString(packageIdentifier);
            });

            console.log("");
            console.log(
                chalk.yellow(
                    `Use the command${targetRegistries.length > 1 ? "s" : ""} below to view the new package version`
                )
            );
            urls.forEach((url) => {
                console.log(chalk.green(`datapm info ${url}`));
            });

            console.log("");
            console.log(
                chalk.yellow(
                    `Share the command${targetRegistries.length > 1 ? "s" : ""} below to fetch the data in this package`
                )
            );
            urls.forEach((url) => {
                console.log(chalk.green(`datapm fetch ${url}`));
            });

            console.log("");
            console.log(chalk.yellow("You can update the package file schema with the following command"));
            console.log(chalk.green(`datapm update ${argv.reference}`));
        }

        process.exit(0);
    }

    async obtainPublishMethod(
        oraRef: Ora,
        packageFile: PackageFile,
        defaultValue: PublishMethod
    ): Promise<PublishMethod> {
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
            const publishTypeSelection = await prompts([
                {
                    type: "autocomplete",
                    name: "method",
                    message: "Data Access Method?",
                    choices: choices
                }
            ]);

            if (publishTypeSelection.method === PublishMethod.SCHEMA_ONLY) {
                if (packageFile.sources.find((s) => s.credentialsIdentifier !== undefined) !== undefined) {
                    // Credentials are required, so tell the user they will have to enter
                    oraRef.info(
                        "Access to this data requires access credentials, and those access credentials will not be published to the server. You will need to share the access credentials with the users of this package manually. Or they will need to obtain their own access credentials to the data source(s) for this package"
                    );

                    oraRef.info(
                        "Because this package requires access credentials, this package can not be made public"
                    );

                    break;
                } else {
                    oraRef.info(
                        "The package will be published to the registry, and consumers will access the data directly. This requires direct connectivity from the client."
                    );
                }

                const confirmAccessRequirements = await prompts(
                    [
                        {
                            name: "confirmed",
                            type: "autocomplete",
                            message: "Is the above ok?",
                            choices: [
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
                    ],
                    defaultPromptOptions
                );

                if (confirmAccessRequirements.confirmed === "no") {
                    continue;
                }

                return PublishMethod.SCHEMA_ONLY;
            }

            if (publishTypeSelection.method === PublishMethod.SCHEMA_AND_DATA) {
                oraRef.info("The data in this package will be copied to the registry.");
                oraRef.info(
                    "Consumers will not receive data updates until you run the 'datapm update' command on this package."
                );
                const confirmDatacopy = await prompts(
                    [
                        {
                            type: "autocomplete",
                            name: "confirmed",
                            message: "Is the above ok?",
                            choices: [
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
                    ],
                    defaultPromptOptions
                );

                if (confirmDatacopy.confirmed === "no") {
                    continue;
                }

                return PublishMethod.SCHEMA_AND_DATA;
            }

            if (publishTypeSelection.method === PublishMethod.SCHEMA_PROXY_DATA) {
                if (packageFile.sources.find((s) => s.credentialsIdentifier !== undefined) !== undefined) {
                    oraRef.info(
                        "The registry will act as a proxy for this data, and therefore you must provide the registry with access credentials for the data."
                    );

                    oraRef.info(
                        "For best security practices, you should supply credentials with limited read-only access as necessary to consume the required data."
                    );

                    const confirmProxy = await prompts(
                        [
                            {
                                type: "autocomplete",
                                name: "confirmed",
                                message: "Is the above ok?",
                                choices: [
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
                        ],
                        defaultPromptOptions
                    );

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
