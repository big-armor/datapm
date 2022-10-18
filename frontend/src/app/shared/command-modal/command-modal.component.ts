import { AuthenticationService } from 'src/app/services/authentication.service';
import { io, Socket } from "socket.io-client";
import {
    JobMessageType,
    SocketEvent,
    TimeoutPromise,
    TaskStatus,
    StartJobResponse,
    Request,
    ErrorResponse,
    SocketResponseType,
    JobMessageRequest,
    JobMessageResponse,
    JobRequestType,
    ParameterAnswer,
    Parameter,
    ParameterType
} from "datapm-lib";
import { getRegistryURL } from 'src/app/helpers/RegistryAccessHelper';
import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

export enum State {
    STARTING,
    ERROR,
    CONNECTED,
    AWAITING_INPUT,
    SUCCESS
}
@Component({
    selector: "app-command",
    templateUrl: "./command-modal.component.html",
    styleUrls: ["./command-modal.component.scss"]
})
export class CommandModalComponent {
    State = State;
    ParameterType = ParameterType;

    @Input() startCommand: () => Promise<void>;

    public state: State = State.STARTING;

    public printLog: string = "";
    public taskContent2: string = "";
    public title: string = "Update Package";

    socket: Socket | null = null;
    public parameters: Parameter<string>[];
    currentParameterIndex: number;
    public currentParameter: Parameter;
    answers?: ParameterAnswer<string>;
    promptResponseCallback?: (response: ParameterAnswer<string>) => void;

    @ViewChild("textControl") public texstControl: ElementRef;
    public stringParameterError?: string;

    public selectForm: FormGroup;
    public selectParameterError?: string;

    constructor(protected authenticationService: AuthenticationService) {}

    ngOnInit(): void {
        this.selectForm = new FormGroup({
            selectControl: new FormControl()
        });
    }

    ngOnDestroy(): void {
        this.disconnectWebsocket();
    }

    async connectWebsocket(): Promise<Socket> {
        const socket = io(getRegistryURL(), {
            path: "/ws/",
            parser: require("socket.io-msgpack-parser"),
            transports: ["polling", "websocket"],
            auth: {
                bearer: this.authenticationService.getAuthorizationHeader()
            }
        });

        return new TimeoutPromise<Socket>(5000, (resolve) => {
            socket.once("connect", async () => {
                socket.once(SocketEvent.READY.toString(), () => {
                    this.socket = socket;
                    resolve(socket);
                });
            });
        });
    }

    disconnectWebsocket() {
        if (!this.socket) return;

        this.socket.disconnect();
    }

    processText(text: string): string {
        const lines = text.split(/\r?\n/);

        const processedLines = [];

        for (const line of lines) {
            processedLines.push(this.processLine(line));
        }

        return processedLines.join("<br/>");
    }

    processLine(line: string): string {
        const colorCodes: { [key: string]: string } = {
            "90": "grey",
            "35": "purple",
            "33": "yellow",
            "37": "grey"
        };

        for (const key in colorCodes) {
            const colorCode = colorCodes[key];
            line = line.replace(new RegExp(`\x1b\\[${key}m`, "g"), `<span style="color: ${colorCode}">`);
            line = line.replace(new RegExp(`\x1b\\[39m`, "g"), "</span>");
        }

        return line;
    }

    addPrintLineMessage(message: { message?: string; messageType?: JobMessageType }) {
        const processedMessage = this.processText(message.message || "");

        let prefix = this.getPrefix(message.messageType);

        this.printLog += (prefix ? prefix : "") + processedMessage + "<br/>";
    }

    updateTaskMessage(message: { message?: string; messageType?: JobMessageType; taskStatus?: TaskStatus }) {
        const processedMessage = this.processText(message.message || "");

        this.taskContent2 = processedMessage;
    }

    getPrefix(messageType?: JobMessageType | TaskStatus): string {
        switch (messageType) {
            case "ERROR":
                return "&#x2753; ";
            case "FAIL":
                return "&#x274C; ";
            case "WARN":
                return "&#x26A0; ";
            case "INFO":
                return "&#x2139; ";
            case "SUCCESS":
                return "&#x2705; ";
            case "RUNNING":
                return "spinner here";
            case "NONE":
            default:
                return;
        }
    }

    public async runCommand(request: Request) {
        if (!this.socket) await this.connectWebsocket();

        const response = await new Promise<StartJobResponse | ErrorResponse>((resolve, reject) => {
            this.socket.emit(SocketEvent.START_PACKAGE_UPDATE, request, (response: StartJobResponse) => {
                resolve(response);
            });
        });

        if (response.responseType === SocketResponseType.ERROR) {
            const errorResponse = response as ErrorResponse;
            console.log("Error: " + errorResponse.message);
            this.printLog += "Error: " + errorResponse.message;
            this.state = State.ERROR;
            return;
        }

        const startJobResponse: StartJobResponse = response as StartJobResponse;

        const channelName = startJobResponse.channelName;
        this.socket.on(
            channelName,
            (message: JobMessageRequest, responseCallback?: (response: JobMessageResponse) => void) => {
                if (message.requestType === JobRequestType.START_TASK) {
                    this.updateTaskMessage(message);
                    responseCallback && responseCallback(new JobMessageResponse(JobRequestType.START_TASK));
                    return;
                }

                if (message.requestType === JobRequestType.TASK_UPDATE) {
                    this.updateTaskMessage(message);
                    responseCallback && responseCallback(new JobMessageResponse(JobRequestType.TASK_UPDATE));
                    return;
                }

                if (message.requestType === JobRequestType.END_TASK) {
                    this.updateTaskMessage({ message: "", messageType: "NONE" });
                    this.addPrintLineMessage({
                        message: message.message,
                        messageType: message.taskStatus as "ERROR" | "SUCCESS"
                    });
                    responseCallback && responseCallback(new JobMessageResponse(JobRequestType.END_TASK));
                    return;
                }

                if (message.requestType === JobRequestType.SET_CURRENT_STEP) {
                    message.message = "\n\x1b[35m" + message.message + "\x1b[39m";
                    this.addPrintLineMessage(message);
                    responseCallback && responseCallback(new JobMessageResponse(JobRequestType.END_TASK));
                    return;
                }

                if (message.requestType === JobRequestType.PRINT) {
                    this.addPrintLineMessage(message);
                    responseCallback && responseCallback(new JobMessageResponse(JobRequestType.PRINT));
                    return;
                }

                if (message.requestType === JobRequestType.EXIT) {
                    this.addPrintLineMessage(message);
                    if (message.taskStatus === "SUCCESS") {
                        this.state = State.SUCCESS;
                    } else {
                        this.state = State.ERROR;
                    }
                    responseCallback && responseCallback(new JobMessageResponse(JobRequestType.EXIT));
                    return;
                }

                if (message.requestType === JobRequestType.PROMPT) {
                    this.addPrintLineMessage(message);

                    this.state = State.AWAITING_INPUT;
                    this.promptUser(message.prompts, responseCallback);
                    return;
                }

                console.error("Unknown request type: " + message.requestType);
            }
        );

        this.socket.on("disconnect", () => {
            if (this.state !== State.SUCCESS) {
                this.state = State.ERROR;
            }
        });

        this.socket.emit(
            channelName,
            new JobMessageRequest(JobRequestType.START_JOB),
            (response: JobMessageResponse | ErrorResponse) => {
                if (response.responseType === SocketResponseType.ERROR) {
                    console.error(response.message);
                    this.addPrintLineMessage({
                        message: response.message,
                        messageType: "ERROR"
                    });
                    this.state = State.ERROR;
                    return;
                }

                this.state = State.CONNECTED;
            }
        );
    }

    public promptUser(parameters: Parameter[], responseCallBack: (response: JobMessageResponse) => void) {
        this.parameters = parameters;
        this.answers = {};
        this.currentParameterIndex = 0;
        this.currentParameter = parameters[this.currentParameterIndex];

        this.state = State.AWAITING_INPUT;

        this.promptResponseCallback = responseCallBack;

        this.initParameter();
    }

    public selectValidateAndNext() {
        const currentParameter = this.parameters[this.currentParameterIndex];

        const value = this.selectForm.value["selectControl"];

        if (value == null) {
            this.selectParameterError = "Must select a value";
            return;
        }

        delete this.selectParameterError;
        this.answers[currentParameter.name] = value;
        this.nextParameter();
    }

    public stringValidateAndNext() {
        const currentParameter = this.parameters[this.currentParameterIndex];

        // get the form value
        const value = this.texstControl.nativeElement.value;

        if (value == null || value == "") {
            this.stringParameterError = "This field is required";
            return;
        } else if (value.length > currentParameter.stringMaximumLength || Number.MAX_SAFE_INTEGER) {
            this.stringParameterError = "Must be shorter than " + currentParameter.stringMaximumLength + " characters";
            return;
        } else if (value.length < currentParameter.stringMinimumLength || Number.MIN_SAFE_INTEGER) {
            this.stringParameterError = "Must be longer than " + currentParameter.stringMinimumLength + " characters";
            return;
        } else if (currentParameter.stringRegExp && !value.match(currentParameter.stringRegExp)) {
            this.stringParameterError = "Must match regular expression: " + currentParameter.stringRegExp;
            return;
        }

        delete this.stringParameterError;

        this.answers[currentParameter.name] = value;

        this.nextParameter();
    }

    public initParameter() {
        const newParameter = this.parameters[this.currentParameterIndex];

        if (newParameter.type === ParameterType.Text) {
            this.texstControl.nativeElement.value = newParameter.defaultValue || "";
            delete this.stringParameterError;
        } else if (newParameter.type === ParameterType.Select) {
            this.selectForm.setValue({ selectControl: newParameter.defaultValue || newParameter.options[0].value });
        }
    }

    public nextParameter() {
        if (this.parameters.length - 1 >= this.currentParameterIndex) {
            this.sendPromptResponse();
            return;
        } else {
            this.currentParameterIndex++;
            this.currentParameter = this.parameters[this.currentParameterIndex];
        }

        this.initParameter();
    }

    public sendPromptResponse() {
        const response = new JobMessageResponse(JobRequestType.PROMPT);
        response.answers = this.answers;

        this.state = State.CONNECTED;

        this.promptResponseCallback(response);

        delete this.answers;
        delete this.promptResponseCallback;
    }
}
