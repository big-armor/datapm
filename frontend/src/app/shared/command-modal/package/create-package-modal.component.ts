import { AfterViewInit, Component, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Socket } from "socket.io-client";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { nameToSlug } from "datapm-lib";
import { CreatePackageGQL } from "src/generated/graphql";
import { DialogService } from "src/app/services/dialog/dialog.service";
import { PackageModalComponent } from "./package-modal.component";

export type CreatePackageModalData = {
    targetCatalogSlug?: string;
};

enum State { 
    AWAITING_INPUT,
    AWAITING_RESPONSE,
    SUCCESS,
    ERROR
}

@Component({
    selector: "app-package-modal",
    templateUrl: "./create-package-modal.component.html",
    styleUrls: ["./create-package-modal.component.scss"]
})
export class CreatePackageModalComponent implements AfterViewInit, OnInit, OnDestroy {
    State = State;
    public state: State = State.AWAITING_INPUT;

    socket: Socket | null = null;

    hasErrors = false;

    form: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: CreatePackageModalData,
        public dialogRef: MatDialogRef<CreatePackageModalComponent>,
        private dialogService: DialogService,
        public createPackageGQL: CreatePackageGQL
    ) {
        this.form = new FormGroup({
            catalogSlug: new FormControl(this.data.targetCatalogSlug, [Validators.required])
        });
    }

    ngOnInit(): void {}
    ngAfterViewInit(): void {}

    ngOnDestroy(): void {}

    packageNameKeyUp() {
        const value = this.form.get("packageName")?.value;

        if (value == null) return;

        const slug = nameToSlug(value);
        this.form.controls.packageSlug.setValue(slug);
    }

    submit() {

        if (this.form.invalid) {
            return;
        }

        this.state = State.AWAITING_RESPONSE;

        const catalogSlug = this.form.get("catalogSlug")?.value;


            this.state = State.SUCCESS;
            this.dialogRef.close();

            this.dialogService.openPackageCommandDialog({
                catalogSlug            })
    }
}
