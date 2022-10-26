import { AfterViewInit, Component, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Socket } from "socket.io-client";
import { CommandModalComponent } from "../command-modal.component";
import { FormGroup } from "@angular/forms";
import { StartPackageRequest } from "datapm-lib";

export type PackageModalData = {
    catalogSlug: string;
    packageSlug?: string;
    packageName?: string;
    packageDescription?: string;
};

enum State { 
    RUNNING
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

    form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: PackageModalData,
        public dialogRef: MatDialogRef<PackageModalComponent>
    ) {
    }

    ngOnInit(): void {
    }
    ngAfterViewInit(): void {
        this.runPackagePackageCommand();
    }

    ngOnDestroy(): void {
        this.command.disconnectWebsocket();
    }

    async runPackagePackageCommand() {
        this.socket = await this.command.connectWebsocket();

        this.command.title = "Publish A Data Package ";

        this.command.runCommand(
            new StartPackageRequest(
                this.data.catalogSlug,
                this.data.packageSlug,
                this.data.packageName,
                this.data.packageDescription
            )
        );
    }
}
