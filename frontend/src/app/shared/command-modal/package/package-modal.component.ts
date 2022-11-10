import { AfterViewInit, Component, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Socket } from "socket.io-client";
import { CommandModalComponent } from "../command-modal.component";
import { FormGroup } from "@angular/forms";
import { JobResult, StartPackageRequest } from "datapm-lib";
import { Router } from "@angular/router";

export type PackageModalData = {
    catalogSlug: string;
    packageSlug: string;
    packageName: string;
    packageDescription: string;
    defaults: boolean;
};

enum State { 
    RUNNING,
    ERROR,
    SUCCESS
}

@Component({
    selector: "app-package-modal",
    templateUrl: "./package-modal.component.html",
    styleUrls: ["./package-modal.component.scss"]
})
export class PackageModalComponent implements AfterViewInit, OnInit, OnDestroy {
    State = State;
    public state: State = State.RUNNING;

    @ViewChild("command") command: CommandModalComponent;

    socket: Socket | null = null;

    result: JobResult<{ packageFileLocation: string }> | null = null;

    form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: PackageModalData,
        private router: Router,
        public dialogRef: MatDialogRef<PackageModalComponent>
    ) {}

    ngOnInit(): void {}
    ngAfterViewInit(): void {
        this.runPackagePackageCommand();
    }

    ngOnDestroy(): void {
        this.command.disconnectWebsocket();
    }

    onResult(result: JobResult<{ packageFileLocation: string }>) {
        this.result = result;
        if (result.exitCode === 0) {
            this.state = State.SUCCESS;
        } else {
            this.state = State.ERROR;
        }
    }

    viewPackage() {
        this.dialogRef.close();
        this.router.navigate(this.result.result.packageFileLocation.split("/"));
    }

    async runPackagePackageCommand() {
        this.socket = await this.command.connectWebsocket();

        this.command.title = "Publish A Data Package ";

        this.command.runCommand(
            new StartPackageRequest(
                this.data.catalogSlug,
                this.data.packageSlug,
                this.data.packageName,
                this.data.packageDescription,
                this.data.defaults
            )
        );
    }
}
