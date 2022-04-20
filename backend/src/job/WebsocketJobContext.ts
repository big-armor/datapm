import { Task, MessageType, TaskStatus } from "datapm-client-lib";
import { JobMessageRequest, JobMessageResponse, JobRequestType, Parameter, ParameterAnswer } from "datapm-lib";
import {  SocketContext } from "../context";
import SocketIO from 'socket.io';
import { BackendJobContextBase } from "./BackendJobContextBase";


export class WebsocketJobContext extends BackendJobContextBase {


    constructor(public jobId:string, private socketContext:SocketContext, private socket: SocketIO.Socket, private channelName: string) {
        super(jobId, socketContext);
    }

    useDefaults(): boolean {
        return false; // TODO make this optional?
    }

    parameterPrompt<T extends string = string>(parameters: Parameter<T>[]): Promise<ParameterAnswer<T>> {
        
        const request = new JobMessageRequest(JobRequestType.PROMPT);
        request.prompts = parameters;

        return new Promise<ParameterAnswer<T>>((resolve, reject) => {
            this.socket.emit(this.channelName, request, (response: JobMessageResponse) => {
                if(response.responseType === JobRequestType.ERROR){
                    reject(response.message);
                }else{
                    if(!response.answers) {
                        throw new Error("No answers received"); 
                    }

                    resolve(response.answers);
                }
            });
        });


    }

    updateSteps(steps: string[]): void {
        const request = new JobMessageRequest(JobRequestType.SET_STEPS);
        request.steps = steps;
        this.socket.emit(this.channelName, request);    }

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

        let taskStatus:TaskStatus = "RUNNING";

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

                this.socket.emit(this.channelName, request);
            },
            clear: (): void =>  {
                const request = new JobMessageRequest(JobRequestType.CLEAR_TASK);
                this.socket.emit(this.channelName, request);
            }
        }

        this.socket.emit(this.channelName, request);

        return task;

    }

    
}