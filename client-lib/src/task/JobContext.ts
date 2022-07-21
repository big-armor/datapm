import { Parameter, ParameterAnswer, DPMConfiguration, PackageFile, TaskStatus } from "datapm-lib";
import path from "path";
import { RepositoryConfig, RegistryConfig } from "../config/Config";
import { PackageFileWithContext, PackageIdentifier } from "../main";
import { MessageType, Task } from "./Task";
import os from "os";
import { SemVer } from "semver";
import { PackageIdentifierInput } from "../generated/graphql";

/** A JobContext is given to a Job. The context is an implementation specific to
 * where the task is executing (server, command line client, etc). The context implementation
 * contains the logic on how to prompt the user for input, provide access to data, etc.
 */

export abstract class JobContext {
    parameterCount = 0;

    answerListeners: ((answer: ParameterAnswer<string>) => void)[] = [];

    /** Should return all of the repository configs for a given repository type */
    abstract getRepositoryConfigsByType(
        relatedPackage: PackageIdentifierInput | undefined,
        type: string
    ): Promise<RepositoryConfig[]>;

    abstract getRepositoryConfig(
        relatedPackage: PackageIdentifierInput | undefined,
        type: string,
        identifier: string
    ): Promise<RepositoryConfig | undefined>;

    /** Should save a repository credential */
    abstract saveRepositoryCredential(
        relatedPackage: PackageIdentifierInput | undefined,
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string,
        credentials: DPMConfiguration
    ): Promise<void>;

    abstract saveRepositoryConfig(
        relatedPackage: PackageIdentifierInput | undefined,
        connectorType: string,
        repositoryConfig: RepositoryConfig
    ): Promise<void>;

    abstract removeRepositoryConfig(
        relatedPackage: PackageIdentifierInput | undefined,
        connectorType: string,
        repositoryIdentifer: string
    ): Promise<void>;

    /**
     *
     * @param relatedPackage Used in backend jobcontexts to restrict access on a per package basis
     * @param connectorType
     * @param repositoryIdentifier
     * @param credentialsIdentifier
     * @returns
     */
    abstract getRepositoryCredential(
        relatedPackage: PackageIdentifierInput | undefined,
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string
    ): Promise<DPMConfiguration | undefined>;

    /** return all configured registries */
    abstract getRegistryConfigs(): RegistryConfig[];

    /** return specific registry configuration */
    abstract getRegistryConfig(url: string): RegistryConfig | undefined;

    public readonly parameterPrompt = async <T extends string = string>(
        parameters: Array<Parameter<T>>
    ): Promise<ParameterAnswer<T>> => {
        const answers = await this._parameterPrompt(parameters);
        this.parameterCount += parameters.length;

        this.answerListeners.forEach((listener) => listener(answers));

        return answers;
    };

    /** Should prompt the user with the given parameter inputs */
    abstract _parameterPrompt<T extends string = string>(parameters: Array<Parameter<T>>): Promise<ParameterAnswer<T>>;

    /** Sets the names of the steps to be performed during the task. Can be updated at any
     * time throughout the task lifecycle.
     */
    abstract updateSteps(steps: string[]): void;

    /** Sets the current step. Must be in the updateSteps(...) previously set */
    abstract setCurrentStep(step: string): void;

    /** Sends a message to the user */
    abstract print(type: MessageType, message: string): void;

    abstract startTask(message: string): Promise<Task>;

    /** Outputs to the logs (not intended for the user console) */
    abstract log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void;

    /** Saves a given package file and returns the PackageFileWithContext */
    abstract saveNewPackageFile(
        catalogSlug: string | undefined,
        packagefile: PackageFile
    ): Promise<PackageFileWithContext>;

    /** Returns a packageFileWithContext reference specific to the context in which
     * the package is being requested.
     */
    abstract getPackageFile(
        reference: string | PackageIdentifier,
        modifiedOrCanonical: "modified" | "canonicalIfAvailable"
    ): Promise<PackageFileWithContext>;

    /* Whether the user opted for default values for this job. Not always possible, but
    should be honored if possible */
    abstract useDefaults(): boolean;

    getParameterCount(): number {
        return this.parameterCount;
    }

    addAnswerListener(listener: (answers: ParameterAnswer<string>) => void): void {
        if (!this.answerListeners.includes(listener)) {
            this.answerListeners.push(listener);
        }
    }

    removeAnswerListener(listener: (answers: ParameterAnswer<string>) => void): void {
        this.answerListeners = this.answerListeners.filter((l) => l !== listener);
    }
}

/** When a job needs to silence interaction with a jobcontext for a brief period of time.
 * Simply wraps a given job context, and does not allow interaction.
 */
export class SilentJobContext extends JobContext {
    constructor(private context: JobContext) {
        super();
    }

    async getRepositoryConfigsByType(
        relatedPackage: PackageIdentifierInput | undefined,
        type: string
    ): Promise<RepositoryConfig[]> {
        return this.context.getRepositoryConfigsByType(relatedPackage, type);
    }

    getRepositoryConfig(
        relatedPackage: PackageIdentifierInput | undefined,
        type: string,
        identifier: string
    ): Promise<RepositoryConfig | undefined> {
        return this.context.getRepositoryConfig(relatedPackage, type, identifier);
    }

    saveRepositoryCredential(
        relatedPackage: PackageIdentifierInput,
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string,
        credentials: DPMConfiguration
    ): Promise<void> {
        return this.context.saveRepositoryCredential(
            relatedPackage,
            connectorType,
            repositoryIdentifier,
            credentialsIdentifier,
            credentials
        );
    }

    saveRepositoryConfig(
        relatedPackage: PackageIdentifierInput | undefined,
        type: string,
        repositoryConfig: RepositoryConfig
    ): Promise<void> {
        return this.context.saveRepositoryConfig(relatedPackage, type, repositoryConfig);
    }

    removeRepositoryConfig(
        relatedPackage: PackageIdentifierInput | undefined,
        type: string,
        repositoryIdentifer: string
    ): Promise<void> {
        return this.context.removeRepositoryConfig(relatedPackage, type, repositoryIdentifer);
    }

    getRepositoryCredential(
        relatedPackage: PackageIdentifier,
        connectorType: string,
        repositoryIdentifier: string,
        credentialsIdentifier: string
    ): Promise<DPMConfiguration | undefined> {
        return this.context.getRepositoryCredential(
            relatedPackage,
            connectorType,
            repositoryIdentifier,
            credentialsIdentifier
        );
    }

    getRegistryConfigs(): RegistryConfig[] {
        return this.context.getRegistryConfigs();
    }

    getRegistryConfig(url: string): RegistryConfig | undefined {
        return this.context.getRegistryConfig(url);
    }

    _parameterPrompt<T extends string = string>(parameters: Parameter<T>[]): Promise<ParameterAnswer<T>> {
        return this.context._parameterPrompt(parameters);
    }

    updateSteps(steps: string[]): void {
        return this.context.updateSteps(steps);
    }

    setCurrentStep(step: string): void {
        // do nothing
    }

    print(type: MessageType, message: string): void {
        // do nothing
    }

    startTask(message: string): Promise<Task> {
        // do nothing

        let taskStatus: TaskStatus = "RUNNING";

        return Promise.resolve({
            clear: () => {
                // do nothing
            },
            end: async (t: TaskStatus) => {
                taskStatus = t;
            },
            getStatus: () => {
                return "SUCCESS";
            },
            setMessage: () => {
                // do nothing
            },
            getLastMessage: () => {
                return undefined;
            }
        });
    }

    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void {
        // do nothing
    }

    saveNewPackageFile(catalogSlug: string | undefined, packagefile: PackageFile): Promise<PackageFileWithContext> {
        if (catalogSlug == null) catalogSlug = "local";

        const majorVersion = new SemVer(packagefile.version).major.toString();

        const filePath = path.join(
            os.homedir(),
            "data",
            catalogSlug,
            packagefile.packageSlug,
            majorVersion,
            packagefile.packageSlug + ".datapm.json"
        );

        return this.context.saveNewPackageFile(filePath, packagefile);
    }

    getPackageFile(
        reference: string | PackageIdentifier,
        modifiedOrCanonical: "modified" | "canonicalIfAvailable"
    ): Promise<PackageFileWithContext> {
        return this.context.getPackageFile(reference, modifiedOrCanonical);
    }

    useDefaults(): boolean {
        return this.context.useDefaults();
    }
}
