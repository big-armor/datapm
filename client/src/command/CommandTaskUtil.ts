import chalk from "chalk";
import ora from "ora";
import path from "path";
import {
    JobContext,
    Task,
    RepositoryConfig,
    RegistryConfig,
    PackageFileWithContext,
    PackageIdentifier,
    TaskStatus
} from "datapm-client-lib";
import { DPMConfiguration, PackageFile, Parameter, ParameterAnswer } from "datapm-lib";
import { cliHandleParameters } from "../util/CLIParameterUtils";
import {
    getRegistryConfigs,
    getRepositoryConfig,
    getRepositoryConfigs,
    getRepositoryCredential,
    removeRepositoryConfig,
    saveRepositoryConfig,
    saveRepositoryCredential
} from "../util/ConfigUtil";
import { LocalPackageFileContext } from "../util/LocalPackageFileContext";
import { getPackage } from "../util/GetPackageUtil";

export class CLIJobContext implements JobContext {
    currentOraSpinner: ora.Ora | undefined;

    currentTask: Task | undefined;

    constructor(private oraRef: ora.Ora, private argv: { defaults?: boolean; quiet?: boolean }) {}

    getPackageFile(
        reference: string | PackageIdentifier,
        modifiedOrCanonical: "modified" | "canonicalIfAvailable"
    ): Promise<PackageFileWithContext> {
        if (typeof reference !== "string") {
            reference =
                reference.registryURL +
                (reference.registryURL ? "/" : "") +
                reference.catalogSlug +
                "/" +
                reference.packageSlug;
        }

        return getPackage(this, reference, modifiedOrCanonical);
    }

    async saveNewPackageFile(
        catalogSlug: string | undefined,
        packagefile: PackageFile
    ): Promise<PackageFileWithContext> {
        const packageFileWithContext = new LocalPackageFileContext(
            this,
            packagefile,
            path.join(process.cwd(), packagefile.packageSlug + ".datapm.json")
        );

        await packageFileWithContext.save(packagefile);

        return packageFileWithContext;
    }

    getRepositoryConfig(type: string, identifier: string): RepositoryConfig | undefined {
        return getRepositoryConfig(type, identifier);
    }

    getRepositoryConfigsByType(type: string): RepositoryConfig[] {
        return getRepositoryConfigs(type);
    }

    async parameterPrompt(parameters: Parameter<string>[]): Promise<ParameterAnswer<string>> {
        if (this.currentOraSpinner) this.currentOraSpinner.stop();

        const answers = await cliHandleParameters(this.argv.defaults || false, parameters);

        if (this.currentOraSpinner) this.currentOraSpinner.start();

        return answers;
    }

    async startTask(taskTitle: string): Promise<Task> {
        if (this.currentTask?.getStatus() === "RUNNING") {
            this.currentTask.end("SUCCESS");
        }

        let taskStatus: TaskStatus = "RUNNING";

        if (this.argv.quiet) {
            return {
                getStatus: () => taskStatus,
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                end: async (status) => {
                    taskStatus = status;
                },
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                setMessage: () => {},
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                clear: () => {}
            };
        }

        // Disable becuase we need to allow for multiple fetches at once, but
        // dont' currently have a reliable way to do that
        // So we just show the last one for now
        // if (this.currentOraSpinner) throw new Error("Trying to start a new task when the old task has not yet ended");

        this.currentOraSpinner = this.oraRef.start(taskTitle);

        this.currentTask = {
            getStatus: () => taskStatus,
            end: async (status, message) => {
                if (!this.currentOraSpinner) return;

                taskStatus = status;

                this.currentOraSpinner.text = message || this.currentOraSpinner.text;
                if (status === "SUCCESS") {
                    this.currentOraSpinner.succeed();
                } else {
                    this.currentOraSpinner.fail();
                }

                this.currentOraSpinner = undefined;
            },
            setMessage: (message) => {
                if (!this.currentOraSpinner) return;

                this.currentOraSpinner.text = message || this.currentOraSpinner.text;
            },
            clear: () => {
                this.currentOraSpinner?.clear();
            }
        };

        return this.currentTask;
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
        // eslint-disable-next-line no-useless-return
        if (this.argv.quiet) return;

        /// TODO: Implement in memory logging with optional debug messages
    }

    updateSteps: () => {
        // Nothing to do
    };

    setCurrentStep(step: string): void {
        if (this.argv.quiet) return;

        console.log("");
        console.log(chalk.magenta(step));
    }

    async saveRepositoryCredential(
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string,
        credentials: DPMConfiguration
    ): Promise<void> {
        await saveRepositoryCredential(connectorType, repositoryIdentifier, credentialsIdentifier, credentials);
    }

    saveRepositoryConfig(type: string, repositoryConfig: RepositoryConfig): void {
        saveRepositoryConfig(type, repositoryConfig);
    }

    removeRepositoryConfig(type: string, repositoryIdentifer: string): void {
        removeRepositoryConfig(type, repositoryIdentifer);
    }

    async getRepositoryCredential(
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string
    ): Promise<DPMConfiguration> {
        return getRepositoryCredential(connectorType, repositoryIdentifier, credentialsIdentifier);
    }

    getRegistryConfigs(): RegistryConfig[] {
        return getRegistryConfigs();
    }

    getRegistryConfig(url: string): RegistryConfig | undefined {
        return getRegistryConfigs().find((registryConfig) => registryConfig.url === url);
    }
}
