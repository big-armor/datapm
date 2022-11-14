import { AfterViewInit, Component, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PackageIdentifierInput } from "src/generated/graphql";
import { Socket } from "socket.io-client";
import {
    StartPackageUpdateRequest} from "datapm-lib";
import { CommandModalComponent } from "../command-modal.component";

export type UpdateModalData = {
    command: "update";
    targetPackage: PackageIdentifierInput;
};


@Component({
    selector: "app-update-modal",
    templateUrl: "./update-modal.component.html",
    styleUrls: ["./update-modal.component.scss"]
})
export class UpdateModalComponent implements AfterViewInit, OnDestroy {
    @ViewChild("command") command: CommandModalComponent;

    socket: Socket | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: UpdateModalData,
        public dialogRef: MatDialogRef<UpdateModalComponent>
    ) {}
    
    ngAfterViewInit(): void {
        this.runPackageUpdateCommand();
    }

    ngOnDestroy(): void {
        this.command.disconnectWebsocket();
    }

    async runPackageUpdateCommand() {
        this.socket = await this.command.connectWebsocket();

        this.command.title =
            "Refresh " + this.data.targetPackage.catalogSlug + "/" + this.data.targetPackage.packageSlug;

        this.command.runCommand(new StartPackageUpdateRequest(this.data.targetPackage, false));
    }
}
