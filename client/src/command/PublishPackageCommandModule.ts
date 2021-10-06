import chalk from "chalk";
import { PackageFile, RegistryReference, PublishMethod, DPMConfiguration, Source } from "datapm-lib";
import ora, { Ora } from "ora";
import prompts from "prompts";
import { valid, SemVer } from "semver";
import { exit } from "yargs";
import { Catalog, CreateVersionInput, PackageIdentifier } from "../generated/graphql";
import { getRepositoryDescriptionByType } from "../repository/RepositoryUtil";
import { getRegistryConfigs, RegistryConfig } from "../util/ConfigUtil";
import { promptForCredentials } from "../util/CredentialsUtil";
import { identifierToString } from "../util/IdentifierUtil";
import { getPackage, PackageFileWithContext } from "../util/PackageAccessUtil";
import { writePackageFile } from "../util/PackageUtil";
import { defaultPromptOptions } from "../util/parameters/DefaultParameterOptions";
import { ParameterOption } from "../util/parameters/Parameter";
import { getRegistryClientWithConfig } from "../util/RegistryClient";
import { PublishArguments } from "./PublishPackageCommand";

export enum PublishSchemaSteps {
    CONNECT = "connect",
    FIND_EXISTING_PACKAGE = "find_existing_package",
    UPDATING_PACKAGE_LISTING = "updating_package_listing",
    UPDATED_PACKAGE_LISTING = "updated_package_listing",
    FOUND_EXISTING_PACKAGE = "found_existing_package",
    NO_EXISTING_PACKAGE_FOUND = "no_existing_package_found",

    CREATE_PACKAGE = "publish_package_file",
    CREATE_PACKAGE_SUCCESS = "publish_package_file_success",
    CREATE_VERSION = "publish_version",
    CREATE_VERSION_SUCCESS = "publish_version_success",
    VERSION_EXISTS_SUCCESS = "version_exists_success"
}

export enum PublishDataSteps {
    GENERATING_SCHEMAS = "generating_schemas",
    STARTING_UPLOAD = "starting_upload",
    UPLOADING_DATA = "uploading_data",
    FINISHED_UPLOAD = "finished_upload"
}

export interface PublishProgress {
    updateStep(step: PublishSchemaSteps, registry: RegistryReference): void;
}

/** A set of registries and their related credentials for the purposes of publishing */
export interface CredentialsByPackageIdentifier {
    packages: Map<string, CredentialsBySourceSlug>;
}

export interface CredentialsBySourceSlug {
    sourceSlugs: Map<string, DPMConfiguration>;
}

export class PublishPackageCommandModule {
    async handleCommand(argv: PublishArguments): Promise<void> {
        const oraRef = ora({
            color: "yellow",
            spinner: "dots"
        });

        console.log("");
        console.log(chalk.magenta("Publishing Options"));

        oraRef.start(`Resolving package file reference: ${argv.reference}`);

        const packageFileWithContext = (await getPackage(argv.reference).catch((error) => {
            oraRef.fail();
            console.log(chalk.red(error.message));
            throw error;
        })) as PackageFileWithContext;

        const packageFile = packageFileWithContext.packageFile;

        oraRef.succeed(`Found target package file: ${packageFileWithContext.packageFileUrl.replace("file://", "")}`);

        if (!packageFile.registries || packageFile.registries.length === 0) {
            if (argv.defaults) {
                console.log("Package file has no registries defined. Can not use --defaults option");
                throw new Error();
            }
        }

        const credentialsByPackageIdentifier: CredentialsByPackageIdentifier = {
            packages: new Map<string, CredentialsBySourceSlug>()
        };

        let targetRegistries: RegistryReference[] = [];

        if (argv.defaults && packageFile.registries && packageFile.registries.length > 0) {
            oraRef.info("Publishing to " + packageFile.registries.join(", "));
            targetRegistries = packageFile.registries;
        } else if (packageFile.registries && packageFile.registries.length > 0) {
            const promptResponse = await prompts([
                {
                    type: "autocomplete",
                    message: "Publish to " + packageFile.registries.join(", ") + "?",
                    name: "confirm",
                    choices: [
                        {
                            title: "Yes, Continue",
                            value: true
                        },
                        {
                            title: "No, Choose A Different Registry",
                            value: false
                        }
                    ]
                }
            ]);

            if (promptResponse.confirm === false) {
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
                        "You have not added a registry API key. Visit datapm.io or another registry, create an account, create an API key, and then add that api key with the 'datapm registry add ...' command."
                    )
                );
                throw new Error();
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

            if (publishMethod === PublishMethod.SCHEMA_PROXY_DATA) {
                const sourceCredentials = new Map<string, DPMConfiguration>();
                credentialsByPackageIdentifier.packages.set(
                    targetRegistryActionResponse.targetRegistry + "/" + catalogSlugActionResponse.catalogSlug,
                    {
                        sourceSlugs: sourceCredentials
                    }
                );

                for (const source of packageFile.sources) {
                    const credentials = await this.obtainCredentials(oraRef, source);
                    sourceCredentials.set(source.slug, credentials);
                }

                // TODO transfer these credentials to the server
                // maybe only if the server doesn't already have them?
            }

            const chosenRegistry = {
                url: targetRegistryActionResponse.targetRegistry,
                catalogSlug: catalogSlugActionResponse.catalogSlug,
                publishMethod: publishMethod
            };

            packageFile.registries =
                packageFile.registries == null ? [chosenRegistry] : [...packageFile.registries, chosenRegistry];

            targetRegistries.push(chosenRegistry);
        }

        oraRef.start("Updating package file...");

        try {
            const packageFileLocation = writePackageFile(packageFile);

            oraRef.succeed(`Updated package file ${packageFileLocation}`);
        } catch (error) {
            oraRef.fail(`Unable to update the package files. ${error.message}`);
            throw error;
        }

        oraRef.start("Publishing schema...");

        await this.attemptPublishSchema(
            oraRef,
            packageFileWithContext,
            targetRegistries,
            credentialsByPackageIdentifier
        )

            .catch(async (error) => {
                if (error.networkError) {
                    if (error.networkError.result) {
                        if (error.networkError.result.errors[0].message.indexOf("API_KEY_NOT_FOUND") !== -1) {
                            oraRef.fail("Failed to publish: Your API KEY is out of date.");
                            oraRef.info("Genarate a new API Key in this registry's web console");
                        } else {
                            oraRef.fail(`Failed to publish: ${error.networkError.result.errors[0].message}`);
                        }
                    } else
                        oraRef.fail(`Failed to publish: ${error.networkError.bodyText || error.networkError.message}`);

                    throw error;
                }

                if (error.message === "README_FILE_NOT_FOUND") {
                    oraRef.fail(`Could not find the README file with the relative path of ${packageFile.readmeFile}`);
                    throw error;
                }

                if (error.message === "LICENSE_FILE_NOT_FOUND") {
                    oraRef.fail(`Could not find the LICENSE file with the relative path of ${packageFile.licenseFile}`);
                    throw error;
                }

                /* if (error.graphQLErrors == null || !error.graphQLErrors[0] || !error.graphQLErrors[0].extensions) {
					oraRef.fail(`Failed to publish: ${error.message}`);
					console.error(JSON.stringify(error));
					throw new error;
				}

				const graphqlError = error.graphQLErrors[0] as GraphQLError;
				const extensions = graphqlError.extensions;  */

                if (error.extensions?.code === "HIGHER_VERSION_REQUIRED") {
                    oraRef.warn(
                        `Because of the changes in this file, the version number must be at least ${error.extensions?.minNextVersion}`
                    );

                    const versionResponse = await prompts(
                        [
                            {
                                name: "versionNumber",
                                type: "text",
                                message: "New version number?",
                                initial: error.extensions?.minNextVersion,
                                validate: (value) => {
                                    if (valid(value) == null)
                                        return "Must be in SemVer format x.y.z (major.minor.patch). Example: 1.2.3";

                                    const propsosedSemVer = new SemVer(value);

                                    const minSemVer = new SemVer(error.extensions?.minNextVersion);

                                    if (minSemVer.compare(propsosedSemVer) === 1) {
                                        return `Must be higher version than ${error.extensions?.minNextVersion}`;
                                    }

                                    return true;
                                }
                            }
                        ],
                        defaultPromptOptions
                    );

                    packageFile.version = versionResponse.versionNumber;

                    oraRef.start("Writing local package file");

                    try {
                        await writePackageFile(packageFile);
                    } catch (error) {
                        oraRef.fail("Error writing package file");
                        throw error;
                    }

                    oraRef.succeed("Updated version number in package file");

                    // oraRef.start("Publishing to registry after version update");

                    try {
                        await this.attemptPublishSchema(
                            oraRef,
                            packageFileWithContext,
                            targetRegistries,
                            credentialsByPackageIdentifier
                        );
                    } catch (error) {
                        oraRef.fail(`Error publishing version after version change. ${error.messasge}`);
                        throw error;
                    }
                    oraRef.succeed("Published to registry after version update");
                } else {
                    throw error;
                }
            })
            .then(() => {
                oraRef.succeed("Published package file to registry");
            })
            .catch((error) => {
                oraRef.fail(`Failed to publish: ${error.message}`);
                exit(1, error);
            });

        if (targetRegistries.find((registry) => registry.publishMethod === PublishMethod.SCHEMA_AND_DATA)) {
            /*
             oraRef.start("Publishing data...");
             await this.attemptPublishData(
                oraRef,
                packageFileWithContext,
                targetRegistries.filter((registry) => registry.publishMethod === PublishMethod.SCHEMA_AND_DATA),
                credentialsByPackageIdentifier
            )
                .then(() => {
                    oraRef.succeed("Published data to registry");
                })
                .catch((error) => {
                    oraRef.fail(`Failed to publish data: ${error.message}`);
                    exit(1, error);
                }); */
        }

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

    async attemptPublishSchema(
        oraRef: Ora,
        packageFileWithContext: PackageFileWithContext,
        targetRegistries: RegistryReference[],
        credentialsBySourceSlug: CredentialsByPackageIdentifier
    ): Promise<void> {
        await this.publishPackageFile(packageFileWithContext, targetRegistries, credentialsBySourceSlug, {
            updateStep: (step: PublishSchemaSteps, registryRef: RegistryReference) => {
                switch (step) {
                    case PublishSchemaSteps.FIND_EXISTING_PACKAGE:
                        oraRef.start("Finding existing package...");
                        break;

                    case PublishSchemaSteps.FOUND_EXISTING_PACKAGE:
                        oraRef.succeed(
                            "Found the existing package - " +
                                identifierToString({
                                    registryURL: registryRef.url,
                                    catalogSlug: registryRef.catalogSlug,
                                    packageSlug: packageFileWithContext.packageFile.packageSlug
                                })
                        );
                        break;

                    case PublishSchemaSteps.UPDATING_PACKAGE_LISTING:
                        oraRef.start("Updating package description and name");
                        break;

                    case PublishSchemaSteps.UPDATED_PACKAGE_LISTING:
                        oraRef.succeed("Package description and name updated");
                        break;

                    case PublishSchemaSteps.NO_EXISTING_PACKAGE_FOUND:
                        oraRef.succeed("Existing package not found.");
                        break;

                    case PublishSchemaSteps.CREATE_PACKAGE:
                        oraRef.start(
                            `Creating new package listing ${registryRef.catalogSlug}/${packageFileWithContext.packageFile.packageSlug}`
                        );
                        break;

                    case PublishSchemaSteps.CREATE_PACKAGE_SUCCESS:
                        oraRef.succeed(
                            `Created new package listing ${registryRef.catalogSlug}/${packageFileWithContext.packageFile.packageSlug}`
                        );
                        break;

                    case PublishSchemaSteps.CREATE_VERSION:
                        oraRef.start(`Publishing version ${packageFileWithContext.packageFile.version}`);
                        break;

                    case PublishSchemaSteps.CREATE_VERSION_SUCCESS:
                        oraRef.succeed(`Published version ${packageFileWithContext.packageFile.version}`);
                        break;

                    case PublishSchemaSteps.VERSION_EXISTS_SUCCESS:
                        oraRef.succeed(`Updated existing version ${packageFileWithContext.packageFile.version}`);
                        break;
                }
            }
        });
    }

    /* async attemptPublishData(
        oraRef: Ora,
        packageFileWithContext: PackageFileWithContext,
        targetRegistries: RegistryReference[],
        credentialsBySourceSlug: CredentialsByPackageIdentifier
    ): Promise<void> {
         await this.publishData(packageFileWithContext, targetRegistries, credentialsBySourceSlug, {
            updateStep: (step: PublishDataSteps, registryRef: RegistryReference, schema: Schema) => {
                switch (step) {
                    case PublishDataSteps.GENERATING_SCHEMAS:
                        oraRef.start("Generating schema..." + schema.title);
                        break;

                    case PublishDataSteps.STARTING_UPLOAD:
                        oraRef.start(
                            "Starting to upload... " +
                                identifierToString({
                                    registryURL: registryRef.url,
                                    catalogSlug: registryRef.catalogSlug,
                                    packageSlug: packageFileWithContext.packageFile.packageSlug
                                }) +
                                " " +
                                schema.title
                        );
                        break;

                    case PublishDataSteps.FINISHED_UPLOAD:
                        oraRef.succeed(
                            "Completed upload of ... " +
                                identifierToString({
                                    registryURL: registryRef.url,
                                    catalogSlug: registryRef.catalogSlug,
                                    packageSlug: packageFileWithContext.packageFile.packageSlug
                                }) +
                                " " +
                                schema.title
                        );
                        break;

                    case PublishDataSteps.UPLOADING_DATA:
                        oraRef.text =
                            "Uploading... " +
                            identifierToString({
                                registryURL: registryRef.url,
                                catalogSlug: registryRef.catalogSlug,
                                packageSlug: packageFileWithContext.packageFile.packageSlug
                            }) +
                            " " +
                            schema.title;
                        break;

                    default:
                        throw new Error("Unhandled PublishDataSteps: " + step);
                }
            }
        }); 
    } */

    async publishPackageFile(
        packageFileWithContext: PackageFileWithContext,
        targetRegistries: RegistryReference[],
        credentialsBySourceSlug: CredentialsByPackageIdentifier,
        context: PublishProgress
    ): Promise<Map<RegistryReference, boolean>> {
        const returnValue: Map<RegistryReference, boolean> = new Map();

        for (const registryRef of targetRegistries) {
            context.updateStep(PublishSchemaSteps.FIND_EXISTING_PACKAGE, registryRef);

            const registry = getRegistryClientWithConfig(registryRef);

            try {
                const existingPackage = await registry.getPackage({
                    catalogSlug: registryRef.catalogSlug,
                    packageSlug: packageFileWithContext.packageFile.packageSlug
                });

                if (existingPackage.errors) {
                    throw existingPackage.errors[0];
                }

                context.updateStep(PublishSchemaSteps.FOUND_EXISTING_PACKAGE, registryRef);

                context.updateStep(PublishSchemaSteps.UPDATING_PACKAGE_LISTING, registryRef);

                await registry.updatePackage(
                    {
                        catalogSlug: registryRef.catalogSlug,
                        packageSlug: packageFileWithContext.packageFile.packageSlug
                    },
                    {
                        description: packageFileWithContext.packageFile.description,
                        displayName: packageFileWithContext.packageFile.displayName
                    }
                );

                context.updateStep(PublishSchemaSteps.UPDATED_PACKAGE_LISTING, registryRef);
            } catch (error) {
                if (!error.message.includes("PACKAGE_NOT_FOUND")) {
                    throw error;
                }

                context.updateStep(PublishSchemaSteps.NO_EXISTING_PACKAGE_FOUND, registryRef);

                context.updateStep(PublishSchemaSteps.CREATE_PACKAGE, registryRef);

                await registry.createPackage({
                    catalogSlug: registryRef.catalogSlug,
                    packageSlug: packageFileWithContext.packageFile.packageSlug,
                    description: packageFileWithContext.packageFile.description,
                    displayName: packageFileWithContext.packageFile.displayName
                });
                context.updateStep(PublishSchemaSteps.CREATE_PACKAGE_SUCCESS, registryRef);
            }

            context.updateStep(PublishSchemaSteps.CREATE_VERSION, registryRef);

            const versions = this.generateCreateVersion(packageFileWithContext, registryRef, credentialsBySourceSlug);

            const serverResponse = await registry.createVersion(versions, {
                catalogSlug: registryRef.catalogSlug,
                packageSlug: packageFileWithContext.packageFile.packageSlug
            });

            if (serverResponse.errors) {
                if (serverResponse.errors.find((error) => error.extensions?.code === "VERSION_EXISTS") !== undefined)
                    context.updateStep(PublishSchemaSteps.VERSION_EXISTS_SUCCESS, registryRef);
                else throw serverResponse.errors[0];
            } else {
                context.updateStep(PublishSchemaSteps.CREATE_VERSION_SUCCESS, registryRef);
            }

            returnValue.set(registryRef, true);
        }

        return returnValue;
    }

    generateCreateVersion(
        packageFileWithContext: PackageFileWithContext,
        registryReference: RegistryReference,
        _credentialsByPackageIdentifier: CredentialsByPackageIdentifier
    ): CreateVersionInput {
        // deep copy the package file
        const packageFile = JSON.parse(JSON.stringify(packageFileWithContext.packageFile)) as PackageFile;

        // filter out all othe registries
        packageFile.registries = [registryReference];

        if (registryReference.publishMethod === PublishMethod.SCHEMA_AND_DATA) {
            // Change all sources to use the target registry as the data repository
            throw new Error("Data publishing not yet implemented");
        } else if (registryReference.publishMethod === PublishMethod.SCHEMA_PROXY_DATA) {
            throw new Error("Publishing with credentials not yet implemented");
        }

        const version: CreateVersionInput = {
            packageFile: JSON.stringify(packageFileWithContext.packageFile)
        };

        return version;
    }

    async obtainCredentials(oraRef: Ora, source: Source): Promise<DPMConfiguration> {
        const repositoryDescription = getRepositoryDescriptionByType(source.type);

        if (repositoryDescription === undefined) {
            throw new Error(`Could not find repository description for type ${source.type}`);
        }
        const repository = await repositoryDescription?.getRepository();

        if (repository === undefined) {
            throw new Error(`Could not find repository implementation for type ${source.type}`);
        }

        const connectionIdentifier = repository.getConnectionIdentifierFromConfiguration(
            source.connectionConfiguration
        );

        console.log(`For the ${repositoryDescription.getDisplayName()} repository ${connectionIdentifier}`);

        const credentialsPromptResponse = await promptForCredentials(
            oraRef,
            repository,
            source.connectionConfiguration,
            {},
            false,
            {}
        );

        return credentialsPromptResponse.credentialsConfiguration;
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
                },
                {
                    title: "Publish schema, proxy data through registry",
                    selected: defaultValue === PublishMethod.SCHEMA_PROXY_DATA,
                    value: PublishMethod.SCHEMA_PROXY_DATA
                },
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

                const confirmAccessRequirements = await prompts([
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
                ]);

                if (confirmAccessRequirements.confirmed === "no") {
                    continue;
                }

                return PublishMethod.SCHEMA_ONLY;
            }

            if (publishTypeSelection.method === PublishMethod.SCHEMA_AND_DATA) {
                oraRef.info(
                    "The data in this package will be copied, as a current snapshot or update, to the registry."
                );
                oraRef.info(
                    "Consumers will not receive data updates until you run the 'datapm update' command on this package."
                );
                const confirmDatacopy = await prompts([
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
                ]);

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
                        "You should supply credentials with limited read-only access necessary to consume the required data."
                    );

                    const confirmProxy = await prompts([
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
