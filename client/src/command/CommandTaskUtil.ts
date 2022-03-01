import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import { JobContext, Task } from "../task/Task";
import { getRepositoryConfigs, RepositoryConfig } from "../util/ConfigUtil";
import { Parameter, ParameterAnswer } from "../util/parameters/Parameter";
import { cliHandleParameters } from "../util/parameters/ParameterUtils";
import { Writable } from "stream";
import { SemVer } from "semver";

export class CLIJobContext implements JobContext {
    constructor(private oraRef: ora.Ora, private argv: { defaults?: boolean; quiet?: boolean }) {}

    async getPackageFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }> {
        const packageFileLocation = path.join(process.cwd(), packageSlug + ".datapm.json");
        return {
            writable: fs.createWriteStream(packageFileLocation),
            location: packageFileLocation
        };
    }

    async getReadMeFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{
        writable: Writable;
        location: string; // eslint-disable-next-line prefer-promise-reject-errors
    }> {
        const packageFileLocation = path.join(process.cwd(), packageSlug + ".README.md");
        return {
            writable: fs.createWriteStream(packageFileLocation),
            location: packageFileLocation
        };
    }

    async getLicenseFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }> {
        const packageFileLocation = path.join(process.cwd(), packageSlug + ".LICENSE.md");
        return {
            writable: fs.createWriteStream(packageFileLocation),
            location: packageFileLocation
        };
    }

    getRepositoryConfigsByType(type: string): RepositoryConfig[] {
        return getRepositoryConfigs(type);
    }

    async parameterPrompt(parameters: Parameter[]): Promise<ParameterAnswer<string>> {
        return await cliHandleParameters(this.argv.defaults || false, parameters);
    }

    async startTask(taskTitle: string): Promise<Task> {
        if (this.argv.quiet) {
            return {
                addSubTask: () => {
                    throw new Error("Not implemented");
                },
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                end: async () => {},
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                setMessage: () => {}
            };
        }

        const oraSpinner = this.oraRef.start(taskTitle);

        return {
            addSubTask: (_subTask) => {
                throw new Error("Not implemented");
            },
            end: async (status, message) => {
                oraSpinner.text = message || oraSpinner.text;
                if (status === "SUCCESS") {
                    oraSpinner.succeed();
                } else {
                    oraSpinner.fail();
                }
            },
            setMessage: (message) => {
                oraSpinner.text = message || oraSpinner.text;
            }
        };
    }

    print(type: string, message: string): void {
        if (this.argv.quiet) return;

        switch (type) {
            case "ERROR":
                this.oraRef.fail(message);
                break;
            case "WARN":
                this.oraRef.warn(message);
                break;
            case "INFO":
                this.oraRef.info(message);
                break;
            case "SUCCESS":
                this.oraRef.succeed(message);
                break;
            case "FAIL":
                this.oraRef.fail(message);
                break;
            case "UPDATE":
                this.oraRef.text = message;
                break;
            case "START":
                this.oraRef.start(message);
                break;
            case "NONE":
                console.log(message);
        }
    }

    log(_message: string): void {
        /// TODO: Implement in memory logging with optional debug messages
    }

    updateSteps: () => {
        // Nothing to do
    };

    setCurrentStep(step: string): void {
        console.log("");
        console.log(chalk.magenta(step));
    }
}
