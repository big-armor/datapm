import { JobContext, MessageType, PackageFileWithContext, PackageIdentifier, RegistryConfig, RepositoryConfig, Task, TaskStatus } from "datapm-client-lib";
import { DPMConfiguration, Parameter, ParameterAnswer, PackageFile } from "datapm-lib";
import { SemVer } from "semver";
import { Writable } from "stream";

/** For jobs that are run without direct user interaction */
export class HeadlessJobContext implements JobContext {

    constructor(private jobId: string) {
    }

    getRepositoryConfigsByType(type: string): RepositoryConfig[] {
        throw new Error("Method not implemented.");
    }
    getRepositoryConfig(type: string, identifier: string): RepositoryConfig | undefined {
        throw new Error("Method not implemented.");
    }
    saveRepositoryCredential(connectorType: string, repositoryIdentifier: string, credentialsIdentifier: string, credentials: DPMConfiguration): Promise<void> {
        throw new Error("Method not implemented.");
    }
    saveRepositoryConfig(type: string, repositoryConfig: RepositoryConfig): void {
        throw new Error("Method not implemented.");
    }
    removeRepositoryConfig(type: string, repositoryIdentifer: string): void {
        throw new Error("Method not implemented.");
    }
    getRepositoryCredential(connectorType: string, repositoryIdentifier: string, credentialsIdentifier: string): Promise<DPMConfiguration> {
        throw new Error("Method not implemented.");
    }
    getRegistryConfigs(): RegistryConfig[] {
        throw new Error("Method not implemented.");
    }
    getRegistryConfig(url: string): RegistryConfig | undefined {
        throw new Error("Method not implemented.");
    }

    async parameterPrompt<T extends string = string>(parameters: Parameter<T>[]): Promise<ParameterAnswer<T>> {
        const answers: ParameterAnswer<T> = {} as ParameterAnswer<T>;

        for (const parameter of parameters) {

            if(parameter.defaultValue == null) {
                throw new Error("During a headless job, the parameter " + parameter.name + " must have a default value.");
            }

            answers[parameter.name] = parameter.defaultValue;
        }

        return answers;

    }

    updateSteps(steps: string[]): void {
        // nothing to do
    }

    setCurrentStep(step: string): void {
        console.log(this.jobId + " step: " + step);
    }

    print(type: MessageType, message: string): void {
        console.log(this.jobId + " " + type + ": " + message);
    }

    async startTask(message: string): Promise<Task> {
        let taskStatus:TaskStatus = "RUNNING";
        return {
            clear: () => {
                // Nothing to do
            },
            end: async (message:string) => {
                console.log(this.jobId + " task ended: " + message);
            },
            getStatus: () => {
                return taskStatus;
            },
            setMessage: (message:string) => {
                // do not fill the logs with these, as they are usually verbose
                // TODO show in debug logs?
            }

        }
    }

    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void {
        console.log(this.jobId + " " + level + ": " + message);
    }

    saveNewPackageFile(catalogSlug: string | undefined, packagefile: PackageFile): Promise<PackageFileWithContext> {
        throw new Error("Method not implemented.");
    }

    getPackageFile(reference: string | PackageIdentifier, modifiedOrCanonical: "modified" | "canonicalIfAvailable"): Promise<PackageFileWithContext> {
        throw new Error("Method not implemented.");
    }

    getPackageFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }> {
        throw new Error("Method not implemented.");
    }

    getReadMeFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }>{
        throw new Error("Method not implemented.");
    }

    getLicenseFileWritable(
        catalogSlug: string | undefined,
        packageSlug: string,
        _version: SemVer
    ): Promise<{ writable: Writable; location: string }>{
        throw new Error("Method not implemented.");
    }
    
}