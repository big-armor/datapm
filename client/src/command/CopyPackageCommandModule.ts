import chalk from "chalk";
import ora from "ora";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { CLIJobContext } from "./CommandTaskUtil";
import { checkDataPMVersion } from "../util/VersionCheckUtil";
import { CopyJobArguments } from "./CopyPackageCommand";
import { ParameterType } from "datapm-lib";
import { exit } from "process";
import os from "os";
import path from "path";
import { SemVer } from "semver";
import { LocalPackageFileContext } from "../util/LocalPackageFileContext";

export class CopyPackageCommandModule {
    async handleCommand(args: CopyJobArguments): Promise<void> {
        printDataPMVersion(args);

        const oraRef = ora({
            color: "yellow",
            spinner: "dots"
        });

        const jobContext = new CLIJobContext(oraRef, args);
        if (args.reference == null) {
            const referencePromptResult = await jobContext.parameterPrompt([
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
            args.reference = referencePromptResult.reference;
        }

        if (args.reference == null) {
            jobContext.print("ERROR", "No package reference provided");
            exit(1);
        }

        let task = await jobContext.startTask(`Resolving package file reference: ${args.reference}`);

        let packageFileWithContext;
        try {
            packageFileWithContext = await jobContext.getPackageFile(args.reference, "canonicalIfAvailable");
        } catch (error) {
            await task.end("ERROR", error.message);
            exit(1);
        }

        const packageFile = packageFileWithContext.packageFile;

        if (packageFile.canonical === false) {
            await task.end(
                "ERROR",
                "Package file is not canonical. This means it is a copy modified for security or convenience reasons."
            );
            jobContext.print(
                "NONE",
                chalk.yellow("Use a canonical (original) package file, or contact the package file author.")
            );
            exit(1);
        }

        await task.end(
            "SUCCESS",
            `Found target package file: ${packageFileWithContext.packageReference.replace("file://", "")}`
        );

        const defaultSaveLocation = path.join(
            os.homedir(),
            "datapm",
            "data",
            packageFileWithContext.catalogSlug ?? "local",
            packageFileWithContext.packageFile.packageSlug,
            new SemVer(packageFileWithContext.packageFile.version).major.toString()
        );

        if (args.defaults && args.dest == null) {
            args.dest = defaultSaveLocation;
        } else if (args.dest == null) {
            const destPromptResult = await jobContext.parameterPrompt([
                {
                    configuration: {},
                    name: "dest",
                    message: "Destination directory?",
                    type: ParameterType.Text,
                    stringMinimumLength: 1,
                    defaultValue: defaultSaveLocation
                }
            ]);

            args.dest = destPromptResult.dest;
        }

        task = await jobContext.startTask("Saving Package File...");

        try {
            const packageFileWithContext = new LocalPackageFileContext(jobContext, packageFile, args.dest, undefined);

            await packageFileWithContext.save(packageFile);

            task.end("SUCCESS", "Package file saved to " + args.dest);
        } catch (e) {
            task.end("ERROR", "Package file not saved: " + e.message);
        }

        await checkDataPMVersion(oraRef);

        process.exit(0);
    }
}
