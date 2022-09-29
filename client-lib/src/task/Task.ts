import { TimeoutPromise } from "datapm-lib";
import { JobContext } from "./JobContext";

export type TaskStatus = "RUNNING" | "ERROR" | "SUCCESS";

export type MessageType = "NONE" | "ERROR" | "WARN" | "INFO" | "DEBUG" | "SUCCESS" | "FAIL" | "UPDATE" | "START";
export interface Task {
    getStatus(): TaskStatus;

    setMessage(message?: string): void;

    getLastMessage(): string | undefined;

    /** After calling end, setStatus should never be called. */
    end(status: TaskStatus, message?: string, error?: Error): Promise<void>;

    // addSubTask(message: string): Task;
}

export interface JobResult<T> {
    exitCode: number;
    errorMessage?: string;
    result?: T | undefined;
}

/** A job is a single set of work for execution */
export abstract class Job<T> {
    private state: "INIT" | "STOPPED" | "STOPPING" | "RUNNING" | "COMPLETED" | "ERROR" = "INIT";

    // eslint-disable-next-line @typescript-eslint/no-unused-vars-experimental
    // eslint-disable-next-line no-useless-constructor
    constructor(private _jobContext: JobContext) {}

    /** Run the task and return an exit code */
    abstract _execute(): Promise<JobResult<T>>;

    async execute(): Promise<JobResult<T>> {
        this.state = "RUNNING";

        try {
            const taskResult = await this._execute();

            this.updateState(taskResult);
            return taskResult;
        } catch (e) {
            return {
                exitCode: 1,
                errorMessage: e.message
            };
        }
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
