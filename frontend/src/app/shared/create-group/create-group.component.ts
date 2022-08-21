import { Component, Inject, OnDestroy } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { CreateGroupGQL } from "src/generated/graphql";
import { Subject } from "rxjs";
import { I } from "@angular/cdk/keycodes";

type State = "INIT" | "LOADING" | "SUCCESS" | "ERROR";

export type CreateGroupResult = { groupSlug: string };

@Component({
    selector: "app-create-group",
    templateUrl: "./create-group.component.html",
    styleUrls: ["./create-group.component.scss"]
})
export class CreateGroupComponent implements OnDestroy {
    private readonly destroy = new Subject<void>();

    public form: FormGroup;
    public state: State = "INIT";
    public error = "";

    public slugValue: string = "";

    constructor(
        private dialogRef: MatDialogRef<CreateGroupComponent>,
        private createGroup: CreateGroupGQL,
        @Inject(MAT_DIALOG_DATA) data: { input: string }
    ) {
        this.form = new FormGroup({
            name: new FormControl(data?.input, {
                validators: [Validators.required]
            }),
            groupSlug: new FormControl(data?.input, {
                validators: [Validators.required]
            }),
            description: new FormControl(data?.input, {
                validators: [Validators.required]
            })
        });
    }

    public ngOnDestroy(): void {
        this.destroy.next();
        this.destroy.complete();
    }

    public nameChanged(value: string): void {
        this.form.setValue({
            name: this.form.value.name,
            groupSlug: (this.form.value.name as string).toLowerCase().replace(/\s+/g, "-"),
            description: this.form.value.description
        });
    }

    public submit(): void {
        if (this.state === "LOADING") {
            return;
        }

        this.state = "LOADING";
        this.createGroup
            .mutate({
                ...this.form.value
            })
            .subscribe(
                (response) => {
                    if (!response.errors) {
                        this.dialogRef.close(this.form.value as CreateGroupResult);
                        return;
                    }

                    for (const error of response.errors) {
                        if (error.message.includes("GROUP_SLUG_NOT_AVAILABLE")) {
                            this.error = `Group slug '${this.form.value.groupSlug}' already exists. Please chose a different slug`;
                        }

                        if (error.message.includes("GROUP_SLUG_REQUIRED")) {
                            this.error = "Please enter a slug (short name) for this group";
                        }

                        if (error.message.includes("GROUP_SLUG_INVALID")) {
                            this.error =
                                "The slug (shortname) must contain only lower case characters, numbers, and dashes (hyphens)";
                        }

                        if (error.message.startsWith("NOT_UNIQUE")) {
                            this.error = "The slug is not unique. Choose a different slug";
                        }
                    }

                    if (!this.error) {
                        this.error = "Unknown error occurred. Please try again or contact support.";
                    }

                    this.state = "ERROR";
                },
                () => {
                    this.state = "ERROR";
                    this.error = "Unknown error occurred";
                }
            );
    }
}
