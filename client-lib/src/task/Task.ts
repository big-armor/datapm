import { TimeoutPromise, Parameter, ParameterAnswer, DPMConfiguration, PackageFile } from "datapm-lib";
import { SemVer } from "semver";
import { Writable } from "stream";
import { RepositoryConfig, RegistryConfig } from "../config/Config";
import { PackageFileWithContext, PackageIdentifier } from "../main";

export type TaskStatus = "RUNNING" | "ERROR" | "SUCCESS";

export type MessageType = "NONE" | "ERROR" | "WARN" | "INFO" | "DEBUG" | "SUCCESS" | "FAIL" | "UPDATE" | "START";
export interface Task {
    getStatus(): TaskStatus;

    setMessage(message?: string): void;

    /** After calling end, setStatus should never be called. */
    end(status: TaskStatus, message?: string, error?: Error): Promise<void>;

    /** Removes the spinner */
    clear(): void;

    // addSubTask(message: string): Task;
}

/** A JobContext is given to a Job. The context is an implementation specific to
 * where the task is executing (server, command line client, etc). The context implementation
 * contains the logic on how to prompt the user for input, provide access to data, etc.
 */
export interface JobContext {
    /** Should return all of the repository configs for a given repository type */
    getRepositoryConfigsByType(type: string): RepositoryConfig[];

    getRepositoryConfig(type: string, identifier: string): RepositoryConfig | undefined;

    /** Should save a repository credential */
    saveRepositoryCredential(
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string,
        credentials: DPMConfiguration
    ): Promise<void>;

    saveRepositoryConfig(type: string, repositoryConfig: RepositoryConfig): void;

    removeRepositoryConfig(type: string, repositoryIdentifer: string): void;

    getRepositoryCredential(
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string
    ): Promise<DPMConfiguration>;

    /** return all configured registries */
    getRegistryConfigs(): RegistryConfig[];

    /** return specific registry configuration */
    getRegistryConfig(url: string): RegistryConfig | undefined;

    /** Should prompt the user with the given parameter inputs */
    parameterPrompt<T extends string = string>(parameters: Array<Parameter<T>>): Promise<ParameterAnswer<T>>;

    /** Sets the names of the steps to be performed during the task. Can be updated at any
     * time throughout the task lifecycle.
     */
    updateSteps(steps: string[]): void;

    /** Sets the current step. Must be in the updateSteps(...) previously set */
    setCurrentStep(step: string): void;

    /** Sends a message to the user */
    print(type: MessageType, message: string): void;

    startTask(message: string): Promise<Task>;

    /** Outputs to the logs (not intended for the user console) */
    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void;

    /** Saves a given package file and returns the PackageFileWithContext */
    saveNewPackageFile(catalogSlug: string | undefined, packagefile: PackageFile): Promise<PackageFileWithContext>;

    /** Returns a packageFileWithContext reference specific to the context in which
     * the package is being requested.
     */
    getPackageFile(
        reference: string | PackageIdentifier,
        modifiedOrCanonical: "modified" | "canonicalIfAvailable"
    ): Promise<PackageFileWithContext>;

    /** Return a writable for a package file */
    getPackageFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }>;

    getReadMeFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }>;

    getLicenseFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }>;
}

export interface JobResult<T> {
    exitCode: number;
    result?: T | undefined;
}

/** A job is a single set of work for execution */
export abstract class Job<T> {
    private state: "INIT" | "STOPPED" | "STOPPING" | "RUNNING" | "COMPLETED" | "ERROR" = "INIT";

    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    // eslint-disable-next-line no-useless-constructor
    constructor(private context: JobContext) {}

    /** Run the task and return an exit code */
    abstract _execute(): Promise<JobResult<T>>;

    async execute(): Promise<JobResult<T>> {
        this.state = "RUNNING";
        const taskResult = await this._execute();

        this.updateState(taskResult);
        return taskResult;
    }

    private updateState(taskResult: JobResult<T>): void {
        if (taskResult.exitCode !== 0) {
            this.state = "ERROR";
        } else if (this.state === "STOPPING") {
            this.state = "STOPPED";
        } else {
            this.state = "COMPLETED";
        }
    }

    stop(): Promise<void> {
        this.state = "STOPPING";
        return new TimeoutPromise(5000, async (resolve) => {
            while (this.state === "STOPPING") {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
            resolve();
        });
    }

    getState(): "INIT" | "STOPPED" | "STOPPING" | "RUNNING" | "COMPLETED" | "ERROR" {
        return this.state;
    }
}
