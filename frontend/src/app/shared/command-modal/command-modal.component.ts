import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { PackageIdentifierInput } from 'src/generated/graphql';
import { io, Socket } from "socket.io-client";
import {
    ErrorResponse,
    JobMessageRequest,
    JobMessageResponse,
    JobMessageType,
    JobRequestType,
    SocketEvent,
    SocketResponseType,
    StartPackageUpdateRequest,
    StartPackageUpdateResponse,
    TimeoutPromise,
    TaskStatus
} from "datapm-lib";
import { getRegistryURL } from 'src/app/helpers/RegistryAccessHelper';
import { DomSanitizer } from '@angular/platform-browser'

export type CommandModalData = {
    command: "update";
    targetPackage: PackageIdentifierInput;
    
}

export enum State {
    STARTING,
    ERROR,
    CONNECTED,
    AWAITING_INPUT,
    SUCCESS
}

@Component({
    selector: "app-command-modal",
    templateUrl: "./command-modal.component.html",
    styleUrls: ["./command-modal.component.scss"]
})
export class CommandModalComponent implements OnInit, OnDestroy {
    State = State;

    public state: State = State.STARTING;

    public printLog: string = "";
    public taskContent2: string = "";
    public title:string = "Update Package";

    socket: Socket | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: CommandModalData,
        public dialogRef: MatDialogRef<CommandModalComponent>,
        private authenticationService: AuthenticationService,
        private domSantiizer: DomSanitizer
    ) {}

    ngOnInit(): void {
        this.runCommand();
    }

    ngOnDestroy(): void {
        this.disconnectWebsocket();
    }

    async runCommand() {
        if (this.data.command === "update") {
            this.runPackageUpdateCommand();
        }
    }

    async runPackageUpdateCommand() {
        this.socket = await this.connectWebsocket();

        this.title = "Refresh " + this.data.targetPackage.catalogSlug + "/" + this.data.targetPackage.packageSlug;

        const response = await new Promise<StartPackageUpdateResponse | ErrorResponse>((resolve, reject) => {
            this.socket.emit(
                SocketEvent.START_PACKAGE_UPDATE,
                new StartPackageUpdateRequest(this.data.targetPackage),
                (response: StartPackageUpdateResponse) => {
                    resolve(response);
                }
            );
        });

        if (response.responseType === SocketResponseType.ERROR) {
            const errorResponse = response as ErrorResponse;
            console.log("Error: " + errorResponse.message);
            this.printLog += "Error: " + errorResponse.message;
            this.state = State.ERROR;
            return;
        }

        const startPackageUpdateResponse: StartPackageUpdateResponse = response as StartPackageUpdateResponse;

        const channelName = startPackageUpdateResponse.channelName;
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
            "33": "yellow"
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
}
