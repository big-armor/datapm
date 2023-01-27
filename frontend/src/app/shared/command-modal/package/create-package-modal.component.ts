import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { Socket } from "socket.io-client";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { nameToSlug } from "datapm-lib";
import { CreatePackageGQL } from "src/generated/graphql";
import { DialogService } from "src/app/services/dialog/dialog.service";
import { MatStepper } from "@angular/material/stepper";
import { packageDisplayNameValidator, packageSlugValidator } from "src/app/helpers/validators";
import { InputComponent } from "../../input/input.component";

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

    currentPage = 0;

    socket: Socket | null = null;

    @ViewChild("stepper") private myStepper: MatStepper;

    @ViewChild("packageNameInput") nameInput: InputComponent;
    @ViewChild("packageDescriptionInput") descriptionInput: InputComponent;

    public nameForm = new FormGroup({
        packageName: new FormControl("", [Validators.required, packageDisplayNameValidator()]),
        packageShortName: new FormControl("", [Validators.required, packageSlugValidator()])
    });

    public descriptionForm = new FormGroup({
        packageDescription: new FormControl("", Validators.required)
    });

    public optionsForm = new FormGroup({
        defaults: new FormControl(true)
    });

    hasErrors = false;

    catalogForm = new FormGroup({
        catalogSlug: new FormControl(this.data.targetCatalogSlug, [Validators.required])
    });

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: CreatePackageModalData,
        public dialogRef: MatDialogRef<CreatePackageModalComponent>,
        private dialogService: DialogService,
        public createPackageGQL: CreatePackageGQL
    ) {}

    ngOnInit(): void {}
    ngAfterViewInit(): void {}

    ngOnDestroy(): void {}

    packageNameKeyUp() {
        const value = this.catalogForm.get("packageName")?.value;

        if (value == null) return;

        const slug = nameToSlug(value);
        this.catalogForm.controls.packageSlug.setValue(slug);
    }

    submit() {

        this.state = State.AWAITING_RESPONSE;

        const catalogSlug = this.catalogForm.get("catalogSlug")?.value;
        const packageSlug = this.nameForm.get("packageShortName")?.value;
        const packageName = this.nameForm.get("packageName")?.value;
        const packageDescription = this.descriptionForm.get("packageDescription")?.value;
        const defaults = this.optionsForm.get("defaults")?.value;

        this.state = State.SUCCESS;
        this.dialogRef.close();

        this.dialogService.openPackageCommandDialog({
            catalogSlug,
            packageDescription,
            packageName,
            packageSlug,
            defaults
        });
    }

    public move(index: number, checkCurrentPageState = true) {

        if(checkCurrentPageState) {

            if(this.currentPage === 0) {
                if (this.catalogForm.invalid) {
                    return;
                }
            }

            if (this.currentPage == 1) {
                
                this.nameForm.markAllAsTouched();
                this.nameForm.markAsDirty();
                this.nameForm.updateValueAndValidity();
                if (this.nameForm.invalid) {
                    this.hasErrors = true;
                    return;
                }
            }

            if (this.currentPage == 2) {
                this.descriptionForm.markAllAsTouched();
                this.descriptionForm.markAsDirty();
                this.descriptionForm.updateValueAndValidity();
                if (this.descriptionForm.invalid) {
                    this.hasErrors = true;
                    return;
                }
            }
        }

        this.currentPage = index;
        this.myStepper.selectedIndex = index;

        if (this.currentPage == 1) {
            setTimeout(() => {
                this.nameInput.takeFocus();
            }, 500);
        }
        if (this.currentPage == 2) {
            setTimeout(() => {
                this.descriptionInput.takeFocus();
            }, 500);
        }
    }

    public next() {
        this.move(this.currentPage + 1);
    }

    public previous() {
        this.move(this.currentPage - 1, false);
    }

    public packageNameChanged(value: string) {
        const shortName = nameToSlug(this.nameForm.get("packageName").value);
        this.nameForm.get("packageShortName").setValue(shortName);
    }
}
