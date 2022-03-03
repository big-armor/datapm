import { JobContext, Task } from "datapm-client";
import { RepositoryConfig } from "datapm-client/src/util/ConfigUtil";
import { Parameter, ParameterAnswer } from "datapm-lib";

export class BackendContext implements JobContext {
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
    
}