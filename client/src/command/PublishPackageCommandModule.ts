import chalk from "chalk";
import { RegistryReference } from "datapm-lib";
import ora, { Ora } from "ora";
import prompts from "prompts";
import { valid, SemVer } from "semver";
import { exit } from "yargs";
import { Catalog, CreateVersionInput, PackageIdentifier } from "../generated/graphql";
import { getRegistryConfigs, RegistryConfig } from "../util/ConfigUtil";
import { identifierToString } from "../util/IdentifierUtil";
import { getPackage, PackageFileWithContext } from "../util/PackageAccessUtil";
import { writePackageFile } from "../util/PackageUtil";
import { defaultPromptOptions } from "../util/parameters/DefaultParameterOptions";
import { getRegistryClientWithConfig } from "../util/RegistryClient";
import { PublishArguments } from "./PublishPackageCommand";

export enum PublishSteps {
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

export interface PublishProgress {
    updateStep(step: PublishSteps, registry: RegistryReference): void;
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

        let targetRegistries: RegistryReference[] = [];
        if (argv.defaults) {
            targetRegistries = packageFile.registries || [];
        } else {
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

            targetRegistries = [
                {
                    url: targetRegistryActionResponse.targetRegistry,
                    catalogSlug: catalogSlugActionResponse.catalogSlug
                }
            ];

            if (packageFileRegistryReferences.length === 0) {
                packageFile.registries = [...(packageFile.registries || []), ...targetRegistries];
            } else {
                packageFileRegistryReferences[0].catalogSlug = catalogSlugActionResponse.catalogSlug;
            }

            oraRef.start("Updating package file...");

            try {
                const packageFileLocation = writePackageFile(packageFile);

                oraRef.succeed(`Updated package file ${packageFileLocation}`);
            } catch (error) {
                oraRef.fail(`Unable to update the package files. ${error.message}`);
                throw error;
            }
        }

        oraRef.start("Publishing...");

        await this.attemptPublish(oraRef, packageFileWithContext, targetRegistries)

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
                        await this.attemptPublish(oraRef, packageFileWithContext, targetRegistries);
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

    async attemptPublish(
        oraRef: Ora,
        packageFileWithContext: PackageFileWithContext,
        targetRegistries: RegistryReference[]
    ): Promise<void> {
        await this.publishPackageFile(packageFileWithContext, targetRegistries, {
            updateStep: (step: PublishSteps, registryRef: RegistryReference) => {
                switch (step) {
                    case PublishSteps.FIND_EXISTING_PACKAGE:
                        oraRef.start("Finding existing package...");
                        break;

                    case PublishSteps.FOUND_EXISTING_PACKAGE:
                        oraRef.succeed(
                            "Found the existing package - " +
                                identifierToString({
                                    registryURL: registryRef.url,
                                    catalogSlug: registryRef.catalogSlug,
                                    packageSlug: packageFileWithContext.packageFile.packageSlug
                                })
                        );
                        break;

                    case PublishSteps.UPDATING_PACKAGE_LISTING:
                        oraRef.start("Updating package description and name");
                        break;

                    case PublishSteps.UPDATED_PACKAGE_LISTING:
                        oraRef.succeed("Package description and name updated");
                        break;

                    case PublishSteps.NO_EXISTING_PACKAGE_FOUND:
                        oraRef.succeed("Existing package not found.");
                        break;

                    case PublishSteps.CREATE_PACKAGE:
                        oraRef.start(
                            `Creating new package listing ${registryRef.catalogSlug}/${packageFileWithContext.packageFile.packageSlug}`
                        );
                        break;

                    case PublishSteps.CREATE_PACKAGE_SUCCESS:
                        oraRef.succeed(
                            `Created new package listing ${registryRef.catalogSlug}/${packageFileWithContext.packageFile.packageSlug}`
                        );
                        break;

                    case PublishSteps.CREATE_VERSION:
                        oraRef.start(`Publishing version ${packageFileWithContext.packageFile.version}`);
                        break;

                    case PublishSteps.CREATE_VERSION_SUCCESS:
                        oraRef.succeed(`Published version ${packageFileWithContext.packageFile.version}`);
                        break;

                    case PublishSteps.VERSION_EXISTS_SUCCESS:
                        oraRef.succeed(`Updated existing version ${packageFileWithContext.packageFile.version}`);
                        break;
                }
            }
        });
    }

    async publishPackageFile(
        packageFileWithContext: PackageFileWithContext,
        targetRegistries: RegistryReference[],
        context: PublishProgress
    ): Promise<Map<RegistryReference, boolean>> {
        const returnValue: Map<RegistryReference, boolean> = new Map();

        for (const registryRef of targetRegistries) {
            context.updateStep(PublishSteps.FIND_EXISTING_PACKAGE, registryRef);

            const registry = getRegistryClientWithConfig(registryRef);

            try {
                const existingPackage = await registry.getPackage({
                    catalogSlug: registryRef.catalogSlug,
                    packageSlug: packageFileWithContext.packageFile.packageSlug
                });

                if (existingPackage.errors) {
                    throw existingPackage.errors[0];
                }

                context.updateStep(PublishSteps.FOUND_EXISTING_PACKAGE, registryRef);

                context.updateStep(PublishSteps.UPDATING_PACKAGE_LISTING, registryRef);

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

                context.updateStep(PublishSteps.UPDATED_PACKAGE_LISTING, registryRef);
            } catch (error) {
                if (!error.message.includes("PACKAGE_NOT_FOUND")) {
                    throw error;
                }

                context.updateStep(PublishSteps.NO_EXISTING_PACKAGE_FOUND, registryRef);

                context.updateStep(PublishSteps.CREATE_PACKAGE, registryRef);

                await registry.createPackage({
                    catalogSlug: registryRef.catalogSlug,
                    packageSlug: packageFileWithContext.packageFile.packageSlug,
                    description: packageFileWithContext.packageFile.description,
                    displayName: packageFileWithContext.packageFile.displayName
                });
                context.updateStep(PublishSteps.CREATE_PACKAGE_SUCCESS, registryRef);
            }

            context.updateStep(PublishSteps.CREATE_VERSION, registryRef);

            const versions = this.generateCreateVersion(packageFileWithContext);

            const serverResponse = await registry.createVersion(versions, {
                catalogSlug: registryRef.catalogSlug,
                packageSlug: packageFileWithContext.packageFile.packageSlug
            });

            if (serverResponse.errors) {
                if (serverResponse.errors.find((error) => error.extensions?.code === "VERSION_EXISTS") !== undefined)
                    context.updateStep(PublishSteps.VERSION_EXISTS_SUCCESS, registryRef);
                else throw serverResponse.errors[0];
            } else {
                context.updateStep(PublishSteps.CREATE_VERSION_SUCCESS, registryRef);
            }

            returnValue.set(registryRef, true);
        }

        return returnValue;
    }

    generateCreateVersion(packageFileWithContext: PackageFileWithContext): CreateVersionInput {
        const version: CreateVersionInput = {
            packageFile: JSON.stringify(packageFileWithContext.packageFile)
        };

        return version;
    }
}
