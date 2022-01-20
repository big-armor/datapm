import chalk from "chalk";
import { Schema } from "datapm-lib";
import ora from "ora";
import { getPackage } from "../util/PackageAccessUtil";
import * as SchemaUtil from "../util/SchemaUtil";
import { InfoArguments } from "./InfoCommand";

export async function getInfo(argv: InfoArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Getting package info: ${argv.reference}`
    });

    const packageFileWithContext = await getPackage(argv.reference.toString(), "modified").catch((error) => {
        if (Array.isArray(error)) {
            if (error.find((_error) => _error.message === "NOT_FOUND")) {
                oraRef.fail("Package not found"); // TODO state the specific package not found
                process.exit(1);
            }
            if (error.find((_error) => _error.message === "NOT_AUTHENTICATED")) {
                oraRef.fail();
                console.log(
                    chalk.red(
                        "You either have not configured an API key, or it was not accepted. Use a web browser to visit the registry, login, and generate new API key. Then apply that API key with the provided command."
                    )
                );
                process.exit(1);
            }
        }
        oraRef.fail();
        console.log(chalk.red(error.message));
        process.exit(1);
    });

    const packageFile = packageFileWithContext.packageFile;
    const version = packageFile.version.split(".").map((section: string) => Number.parseInt(section));

    try {
        console.log(chalk.black("-------------------"));
        console.log(`${chalk.gray("Package: ")}${packageFile.displayName}`);
        console.log(`${chalk.gray("Version: ")}${chalk.yellow(`${version[0]}.${version[1]}.${version[2]}`)}`);

        if (packageFile.website) console.log(`${chalk.gray("Website: ")}${packageFile.website}`);

        const description = packageFile.description;
        console.log(`${description}\r\n`);

        packageFile.schemas?.forEach((schema: Schema) => {
            SchemaUtil.print(schema);
        });

        const readme = packageFileWithContext.packageFile.readmeMarkdown;

        if (readme !== null) {
            console.log(chalk.black("-------------------"));
            console.log(chalk.grey("README"));
            console.log(readme);
        }

        const license = packageFileWithContext.packageFile.licenseMarkdown;

        if (license !== null) {
            console.log(chalk.black("-------------------"));
            console.log(chalk.grey("LICENSE"));
            console.log(license);
        }

        console.log(chalk.black("-------------------"));
    } catch (error) {
        // const result = error.result as ApolloQueryResult<{package: Package;}>;
        console.log(chalk.red(`Error getting info: ${error}`));
    }
}
