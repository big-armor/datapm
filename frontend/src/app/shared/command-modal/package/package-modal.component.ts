import { AfterViewInit, Component, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Socket } from "socket.io-client";
import { CommandModalComponent } from "../command-modal.component";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { nameToSlug } from "datapm-lib";

export type PackageModalData = {
    targetCatalogSlug?: string;
};

enum State { 
    INITIAL_PARAMETERS,
    RUNNING
}

@Component({
    selector: "app-package-modal",
    templateUrl: "./package-modal.component.html",
    styleUrls: ["./package-modal.component.scss"]
})
export class PackageModalComponent implements AfterViewInit, OnInit, OnDestroy {
    State = State;
    public state: State = State.INITIAL_PARAMETERS;

    @ViewChild("command") command: CommandModalComponent;

    socket: Socket | null = null;

    form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: PackageModalData,
        public dialogRef: MatDialogRef<PackageModalComponent>
    ) {
        this.form = new FormGroup({
            catalogSlug: new FormControl(this.data.targetCatalogSlug, [Validators.required]),
            packageSlug: new FormControl("", [Validators.required]),
            packageName: new FormControl("", [Validators.required]),
            packageDescription: new FormControl("", [Validators.required])
        });
    }

    ngOnInit(): void {}
    ngAfterViewInit(): void {}

    ngOnDestroy(): void {
        this.command.disconnectWebsocket();
    }

    async runPackagePackageCommand() {
        this.socket = await this.command.connectWebsocket();

        this.command.title = "Create New Package ";

        // this.command.runCommand(new StartPackageRequest(this.data.targetPackage));
    }

    packageNameKeyUp() {
        const slug = nameToSlug(this.form.get("packageName").value);
        this.form.controls.packageSlug.setValue(slug);
    }
}
