import { JobContext, Task, RepositoryConfig, RegistryConfig } from "datapm-client-lib";
import { DPMConfiguration, Parameter, ParameterAnswer } from "datapm-lib";
import { SemVer } from "semver";
import { Writable } from "stream";
import { SocketContext } from "../context";

export class BackendContext implements JobContext {

    constructor(private socketContext:SocketContext) {
        
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
    getRepositoryConfigsByType(type: string): RepositoryConfig[] {
        throw new Error("Method not implemented.");
    }
    parameterPrompt: <T extends string = string>(parameters: Parameter<T>[]) => Promise<ParameterAnswer<T>>;
    updateSteps(steps: string[]): void {
        throw new Error("Method not implemented.");
    }
    setCurrentStep(step: string): void {
        throw new Error("Method not implemented.");
    }
    print(type: "NONE" | "ERROR" | "WARN" | "INFO" | "DEBUG" | "SUCCESS" | "FAIL" | "UPDATE" | "START", message: string): void {
        throw new Error("Method not implemented.");
    }
    startTask(message: string): Promise<Task> {
        throw new Error("Method not implemented.");
    }
    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string): void {
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