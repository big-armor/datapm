import chalk from "chalk";
import { Schema } from "datapm-lib";
import { Job, JobResult } from "../task/Task";
import { JobContext } from "../task/JobContext";
import { printSchema } from "../util/SchemaUtil";
import { obtainReference } from "../util/ReferenceUtil";
export class InfoJobArguments {
    reference?: string;
}
export class InfoJobResult {}
export class InfoJob extends Job<InfoJobResult> {
    constructor(private jobContext: JobContext, private args: InfoJobArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<InfoJobResult>> {
        let packageFileWithContext;

        if (this.args.reference == null) {
            this.args.reference = await obtainReference(this.jobContext, "Package identifier, url, or file?", false);
        }

        try {
            packageFileWithContext = await this.jobContext.getPackageFile(this.args.reference.toString(), "modified");
        } catch (error) {
            if (Array.isArray(error)) {
                if (error.find((_error) => _error.message === "NOT_FOUND")) {
                    this.jobContext.print("ERROR", "Package not found"); // TODO state the specific package not found
                    return {
                        exitCode: 1
                    };
                }
                if (error.find((_error) => _error.message === "NOT_AUTHENTICATED")) {
                    this.jobContext.print(
                        "ERROR",
                        "You either have not configured an API key, or it was not accepted. Use a web browser to visit the registry, login, and generate new API key. Then apply that API key with the provided command."
                    );
                    return {
                        exitCode: 1
                    };
                }
            }
            this.jobContext.print("ERROR", error.message);
            return {
                exitCode: 1
            };
        }

        const packageFile = packageFileWithContext.packageFile;
        const version = packageFile.version.split(".").map((section: string) => Number.parseInt(section));

        try {
            this.jobContext.print("NONE", chalk.black("-------------------"));
            this.jobContext.print("NONE", `${chalk.gray("Package: ")}${packageFile.displayName}`);
            this.jobContext.print(
                "NONE",
                `${chalk.gray("Version: ")}${chalk.yellow(`${version[0]}.${version[1]}.${version[2]}`)}`
            );

            if (packageFile.website) this.jobContext.print("NONE", `${chalk.gray("Website: ")}${packageFile.website}`);

            const description = packageFile.description;
            this.jobContext.print("NONE", `${description}\r\n`);

            packageFile.schemas?.forEach((schema: Schema) => {
                this.jobContext.setCurrentStep(schema.title + " Schema Info");
                printSchema(this.jobContext, schema);
            });

            const readme = packageFileWithContext.packageFile.readmeMarkdown;

            if (readme != null) {
                this.jobContext.print("NONE", chalk.black("-------------------"));
                this.jobContext.print("NONE", chalk.grey("README"));
                this.jobContext.print("NONE", readme);
            }

            const license = packageFileWithContext.packageFile.licenseMarkdown;

            if (license != null) {
                this.jobContext.print("NONE", chalk.black("-------------------"));
                this.jobContext.print("NONE", chalk.grey("LICENSE"));
                this.jobContext.print("NONE", license);
            }

            this.jobContext.print("NONE", chalk.black("-------------------"));
        } catch (error) {
            // const result = error.result as ApolloQueryResult<{package: Package;}>;
            this.jobContext.print("NONE", chalk.red(`Error getting info: ${error}`));
        }

        return {
            exitCode: 0
        };
    }
}
