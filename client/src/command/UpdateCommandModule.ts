import chalk from "chalk";
import { comparePackages, diffCompatibility, nextVersion, PackageFile, Schema, StreamSet } from "datapm-lib";
import ora from "ora";
import { exit } from "process";
import prompts from "prompts";
import { Permission } from "../generated/graphql";
import { getSourceByType } from "../repository/SourceUtil";
import { getRepositoryCredential } from "../util/ConfigUtil";
import { getPackage, RegistryPackageFileContext } from "../util/PackageAccessUtil";
import { differenceToString } from "../util/PackageUtil";
import clone from "rfdc";
import { LogType } from "../util/LoggingUtils";
import { UpdateArguments } from "./UpdateCommand";
import { inspectSource, inspectStreamSet } from "./PackageCommandModule";
import { defaultPromptOptions } from "../util/parameters/DefaultParameterOptions";
import { cliHandleParameters } from "../util/parameters/ParameterUtils";
import { SourceInspectionContext } from "../repository/Source";
import { getRepositoryDescriptionByType } from "../repository/RepositoryUtil";
import { obtainConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { checkPackagePermissionsOnRegistry } from "../util/RegistryPermissions";
import { SemVer } from "semver";

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

    if (argv.reference == null) throw new Error("Package file or URL is required");

    // Finding package
    oraRef.start("Finding package file...");

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
        const repositoryDescription = getRepositoryDescriptionByType(sourceObject.type);

        if (repositoryDescription == null) {
            oraRef.fail("No repository found to inspect this data - " + sourceObject.type);
            exit(1);
        }

        const repository = await repositoryDescription.getRepository();

        const sourceDescription = getSourceByType(sourceObject.type);
        const source = await (await sourceDescription)?.getSource();

        if (source == null) {
            oraRef.fail("No source implementation found to inspect this data - " + sourceObject.type);
            exit(1);
        }

        const connectionConfigurationResults = await obtainConnectionConfiguration(
            oraRef,
            repository,
            sourceObject.connectionConfiguration,
            argv.defaults
        );

        if (connectionConfigurationResults === false) {
            process.exit(1);
        }
        const connectionConfiguration = connectionConfigurationResults.connectionConfiguration;

        const repositoryIdentifier = await repository.getConnectionIdentifierFromConfiguration(connectionConfiguration);

        let credentialsConfiguration = {};

        if (sourceObject.credentialsIdentifier) {
            try {
                credentialsConfiguration = await getRepositoryCredential(
                    repository.getType(),
                    repositoryIdentifier,
                    sourceObject.credentialsIdentifier
                );
            } catch (error) {
                oraRef.warn("The credential " + sourceObject.credentialsIdentifier + " could not be found or read.");
            }
        }

        const credentialsConfigurationResults = await obtainCredentialsConfiguration(
            oraRef,
            repository,
            connectionConfiguration,
            credentialsConfiguration,
            argv.defaults
        );

        if (credentialsConfigurationResults === false) {
            process.exit(1);
        }

        credentialsConfiguration = credentialsConfigurationResults.credentialsConfiguration;

        const uriInspectionResults = await inspectSource(
            source,
            sourceInspectionContext,
            oraRef,
            sourceObject.connectionConfiguration,
            credentialsConfiguration,
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

    differences = comparePackages(oldPackageFile, newPackageFile);

    const compatibility = diffCompatibility(differences);

    const lastestVersionSemVer = new SemVer(oldPackageFile.version);

    const minNextVersion = nextVersion(lastestVersionSemVer, compatibility);

    newPackageFile = {
        ...newPackageFile,
        updatedDate: new Date(),
        version: minNextVersion.format()
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
