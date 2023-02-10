import { AfterViewInit, Component, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Socket } from "socket.io-client";
import { CommandModalComponent } from "../command-modal.component";
import { FormGroup } from "@angular/forms";
import { JobResult, StartFetchRequest } from "datapm-lib";
import { Router } from "@angular/router";

export type FetchModalData = {
    catalogSlug: string;
    packageSlug: string;
    sinkType: string;
    defaults: boolean;
};

enum State { 
    RUNNING,
    ERROR,
    SUCCESS
}

@Component({
    selector: "app-package-modal",
    templateUrl: "./fetch-modal.component.html",
    styleUrls: ["./fetch-modal.component.scss"]
})
export class FetchModalComponent implements AfterViewInit, OnInit, OnDestroy {
    State = State;
    public state: State = State.RUNNING;

    @ViewChild("command") command: CommandModalComponent;

    socket: Socket | null = null;

    result: JobResult<void> | null = null;

    form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: FetchModalData,
        private router: Router,
        public dialogRef: MatDialogRef<FetchModalComponent>
    ) {}

    ngOnInit(): void {}
    ngAfterViewInit(): void {
        this.runFetchPackageCommand();
    }

    ngOnDestroy(): void {
        this.command.disconnectWebsocket();
    }

    onResult(result: JobResult<void>) {
        this.result = result;
        if (result.exitCode === 0) {
            this.state = State.SUCCESS;
        } else {
            this.state = State.ERROR;
        }
    }

    close() {
        this.dialogRef.close();
    }

    async runFetchPackageCommand() {
        this.socket = await this.command.connectWebsocket();

        this.command.title = "Publish A Data Package ";

        this.command.runCommand(new StartFetchRequest(
            this.data.catalogSlug,
            this.data.packageSlug,
            this.data.sinkType,
            this.data.defaults
        ));
    }
}
