import { Task, MessageType, TaskStatus, validatePromptResponse } from "datapm-client-lib";
import {
    JobMessageRequest,
    JobMessageResponse,
    JobRequestType,
    Parameter,
    ParameterAnswer,
    ParameterType
} from "datapm-lib";
import { AuthenticatedContext } from "../context";
import SocketIO from "socket.io";
import { BackendJobContextBase } from "./BackendJobContextBase";

export class WebsocketJobContext extends BackendJobContextBase {
    constructor(
        public jobId: string,
        private socketContext: AuthenticatedContext,
        private socket: SocketIO.Socket,
        private channelName: string,
        private defaults: boolean
    ) {
        super(jobId, socketContext);
    }

    useDefaults(): boolean {
        return this.defaults;
    }

    async _parameterPrompt<T extends string = string>(parameters: Parameter<T>[]): Promise<ParameterAnswer<T>> {
        this.parameterCount += parameters.length;

        const validAnswers: ParameterAnswer<string> = {};

        let currentIndex = 0;
        let currentParameter: Parameter | undefined = parameters[currentIndex++];

        while (currentParameter) {
            const request = new JobMessageRequest(JobRequestType.PROMPT);
            request.prompts = [currentParameter];

            const response = await new Promise<JobMessageResponse>((resolve, reject) => {
                this.socket.emit(this.channelName, request, (response: JobMessageResponse) => {
                    if (response.responseType === JobRequestType.ERROR) {
                        reject(response.message);
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response.answers === undefined) continue;

            const answer = response.answers[currentParameter.name];
            const validateResult = validatePromptResponse(answer, currentParameter);
            if (validateResult !== true) {
                const request = new JobMessageRequest(JobRequestType.PRINT);
                request.message = validateResult;
                request.messageType = "ERROR";

                this.socket.emit(this.channelName, request);
                continue;
            }

            validAnswers[currentParameter.name] = answer;
            currentParameter.configuration[currentParameter.name] = answer;
            currentParameter = parameters[currentIndex++];
        }

        return validAnswers;
    }

    updateSteps(steps: string[]): void {
        const request = new JobMessageRequest(JobRequestType.SET_STEPS);
        request.steps = steps;
        this.socket.emit(this.channelName, request);
    }

    setCurrentStep(step: string): void {
        const request = new JobMessageRequest(JobRequestType.SET_CURRENT_STEP);
        request.message = step;
        this.socket.emit(this.channelName, request);
    }

    print(type: MessageType, message: string): void {
        const request = new JobMessageRequest(JobRequestType.PRINT);
        request.message = message;
        request.messageType = type;

        this.socket.emit(this.channelName, request);
    }

    async startTask(message: string): Promise<Task> {
        const request = new JobMessageRequest(JobRequestType.START_TASK);
        request.message = message;

        const taskStatus: TaskStatus = "RUNNING";
        let lastMessage: string | undefined;

        const task: Task = {
            getStatus: () => {
                return taskStatus;
            },
            end: (status: TaskStatus, message?: string) => {
                const endTaskMessage = new JobMessageRequest(JobRequestType.END_TASK);
                endTaskMessage.taskStatus = status;
                endTaskMessage.message = message;

                return new Promise<void>((resolve, reject) => {
                    this.socket.emit(this.channelName, endTaskMessage, (response: JobMessageResponse) => {
                        if (response.responseType === JobRequestType.ERROR) {
                            reject(response.message);
                        } else {
                            resolve();
                        }
                    });
                });
            },
            setMessage: (message: string) => {
                const request = new JobMessageRequest(JobRequestType.TASK_UPDATE);
                request.message = message;
                lastMessage = message;

                this.socket.emit(this.channelName, request);
            },
            getLastMessage: () => {
                return lastMessage;
            }
        };

        this.socket.emit(this.channelName, request);

        return task;
    }
}
