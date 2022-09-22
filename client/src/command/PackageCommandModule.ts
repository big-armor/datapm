import chalk from "chalk";
import ora from "ora";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { PackageJob } from "datapm-client-lib";
import { CLIJobContext } from "./CommandTaskUtil";
import { PackageCommandArguments } from "./PackageCommand";
import { exit } from "process";
import { PublishPackageCommandModule } from "./PublishPackageCommandModule";
import { ParameterType } from "datapm-lib";
import { checkDataPMVersion } from "../util/VersionCheckUtil";

export async function generatePackage(args: PackageCommandArguments): Promise<void> {
    printDataPMVersion(args);

    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Inspecting URIs...`
    });

    const jobContext = new CLIJobContext(oraRef, args);

    const job = new PackageJob(jobContext, args);

    const jobResult = await job.execute();

    if (jobResult.exitCode !== 0) {
        console.error(chalk.red(`Error: ${jobResult.errorMessage}`));
        exit(jobResult.exitCode);
    }

    // Output Results
    if (args.publish !== true && args.defaults) {
        jobContext.print("NONE", "");
        jobContext.print("NONE", chalk.grey("When you are ready, you can publish with the following command"));
        jobContext.print("NONE", chalk.green(`datapm publish ${jobResult.result?.packageFileLocation}`));
        exit(0);
    }

    jobContext.setCurrentStep("Publishing");

    if (args.publish !== true) {
        const schemaPublishResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.AutoComplete,
                name: "publish",
                message: "Publish to registry?",
                configuration: {},
                options: [
                    { title: "Yes", value: "yes" },
                    { title: "No", value: "no" }
                ]
            }
        ]);

        const publishType = schemaPublishResponse.publish;

        if (publishType !== "yes") {
            jobContext.print("NONE", "");
            jobContext.print("NONE", chalk.grey("When you are ready, you can publish with the following command"));
            jobContext.print("NONE", chalk.green(`datapm publish ${jobResult.result?.packageFileLocation}`));
            exit(0);
        }
    }

    // Publish Package
    const publishCommand = new PublishPackageCommandModule();

    try {
        await publishCommand.handleCommand({ reference: jobResult.result?.packageFileLocation });
    } catch (error) {
        jobContext.print("ERROR", error.message);

        jobContext.print("NONE", "");
        jobContext.print("NONE", chalk.grey("You can publish the package file with the following command later"));
        jobContext.print("NONE", chalk.green(`datapm publish ${jobResult.result?.packageFileLocation}`));
        exit(1);
    }

    console.log(" ");

    await checkDataPMVersion(oraRef);

    process.exit(0);
}
