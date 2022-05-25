import chalk from "chalk";
import ora from "ora";
import path from "path";
import {
    Task,
    RepositoryConfig,
    RegistryConfig,
    PackageFileWithContext,
    PackageIdentifier,
    TaskStatus,
    JobContext
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

export class CLIJobContext extends JobContext {
    currentOraSpinner: ora.Ora | undefined;

    currentTasks: Task[] = [];

    parameterCount = 0;

    constructor(private oraRef: ora.Ora, private argv: { defaults?: boolean; quiet?: boolean }) {
        super();
    }

    getParameterCount(): number {
        return this.parameterCount;
    }

    useDefaults(): boolean {
        return this.argv.defaults || false;
    }

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

    async _parameterPrompt(parameters: Parameter<string>[]): Promise<ParameterAnswer<string>> {
        if (this.currentOraSpinner) this.currentOraSpinner.stop();

        const answers = await cliHandleParameters(this.argv.defaults || false, parameters);

        if (this.currentOraSpinner) this.currentOraSpinner.start();

        this.parameterCount += parameters.length;

        return answers;
    }

    async startTask(taskTitle: string): Promise<Task> {
        if (this.argv.quiet) {
            return {
                getStatus: () => taskStatus,
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                end: async (status) => {
                    taskStatus = status;
                },
                // eslint-disable-next-line @typescript-eslint/no-empty-function
                setMessage: () => {},
                getLastMessage: () => undefined
            };
        }

        if (this.currentTasks.length === 0) {
            this.currentOraSpinner = this.oraRef.start(taskTitle);
        }

        let taskStatus: TaskStatus = "RUNNING";

        // Disable becuase we need to allow for multiple fetches at once, but
        // dont' currently have a reliable way to do that
        // So we just show the last one for now
        // if (this.currentOraSpinner) throw new Error("Trying to start a new task when the old task has not yet ended");

        this.currentOraSpinner = this.oraRef.start(taskTitle);

        let currentMessage: string | undefined = taskTitle;

        const currentTask: Task = {
            getStatus: () => taskStatus,
            end: async (status, message) => {
                taskStatus = status;

                currentMessage = message;

                if (message) {
                    this.currentOraSpinner?.stop();

                    if (status === "SUCCESS") {
                        this.oraRef.succeed(message);
                    } else {
                        this.oraRef.fail(message);
                    }
                }

                this.currentTasks = this.currentTasks.filter((t) => t !== currentTask);

                if (this.currentTasks.length === 0) {
                    this.currentOraSpinner?.stop();
                    this.currentOraSpinner = undefined;
                } else {
                    this.currentOraSpinner?.start();
                    this.updateOraRefMessage();
                }
            },
            setMessage: (message) => {
                currentMessage = message || "";

                this.updateOraRefMessage();
            },
            getLastMessage(): string | undefined {
                return currentMessage;
            }
        };

        this.currentTasks.push(currentTask);

        return currentTask;
    }

    updateOraRefMessage(): void {
        let messageString = "";

        for (const task of this.currentTasks) {
            messageString += task.getLastMessage() + "\n";
        }

        if (this.currentOraSpinner) this.currentOraSpinner.text = messageString;
    }

    print(type: string, message: string): void {
        if (this.argv.quiet) return;

        if (this.currentOraSpinner) this.currentOraSpinner.stop();

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

        if (this.currentOraSpinner) this.currentOraSpinner.start();
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
    ): Promise<DPMConfiguration | undefined> {
        return getRepositoryCredential(connectorType, repositoryIdentifier, credentialsIdentifier);
    }

    getRegistryConfigs(): RegistryConfig[] {
        return getRegistryConfigs();
    }

    getRegistryConfig(url: string): RegistryConfig | undefined {
        return getRegistryConfigs().find((registryConfig) => registryConfig.url === url);
    }
}
