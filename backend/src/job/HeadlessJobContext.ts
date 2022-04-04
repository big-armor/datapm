import { JobContext, MessageType, PackageFileWithContext, PackageIdentifier, RegistryConfig, RepositoryConfig, Task, TaskStatus } from "datapm-client-lib";
import { DPMConfiguration, Parameter, ParameterAnswer, PackageFile } from "datapm-lib";
import { SemVer } from "semver";
import { Writable } from "stream";
import { Context } from "../context";
import { BackendJobContextBase } from "./BackendJobContextBase";

/** For jobs that are run without direct user interaction */
export class HeadlessJobContext extends BackendJobContextBase{

    constructor(public jobId: string, context:Context) {
        super(jobId, context )
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
        this.log("INFO", "task started: " + message);
        return {
            clear: () => {
                // Nothing to do
            },
            end: async (taskStatus: TaskStatus, message:string, error: Error) => {
                this.log("INFO","task ended: " + message);
                if(error) {
                    this.log("ERROR",error);
                }
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

    log(level: "ERROR" | "WARN" | "INFO" | "DEBUG", message: string | Error): void {

        if(typeof message == "string") {
            console.log(this.jobId + " " + level + ": " + message);
        } else {
            console.error(this.jobId + " " + level + ": " + message.message);
            console.error(message as Error);
        }
    }

    
}