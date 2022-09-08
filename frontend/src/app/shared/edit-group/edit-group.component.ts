import { Component, Inject } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import { CurrentUser, Group, Permission, UpdateGroupGQL } from "src/generated/graphql";
import { ImageService } from "../../services/image.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

@Component({
    selector: "app-edit-group",
    templateUrl: "./edit-group.component.html",
    styleUrls: ["./edit-group.component.scss"]
})
export class EditGroupComponent {
    private readonly destroy = new Subject<void>();

    form: FormGroup;
    public readonly errorMsg = {
        displayName: {
            required: "Group name is required"
        },
        newSlug: {
            REQUIRED: "Group slug is required",
            INVALID_CHARACTERS:
                "Group slug must contain only numbers, letters, hyphens, and may not start or end with a hyphen.",
            TOO_LONG: "Group slug must be less than 40 characters long.",
            NOT_AVAILABLE: "That group slug is not available."
        }
    };
    state: PageState = "INIT";
    confirmDialogOpened: boolean = false;
    Permission = Permission;

    public user: CurrentUser;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: Group,
        private updateGroup: UpdateGroupGQL,
        private dialogRef: MatDialogRef<EditGroupComponent>,
        private dialog: MatDialog,
        private imageService: ImageService,
        private authenticationService: AuthenticationService
    ) {
        this.form = new FormGroup({
            name: new FormControl(data.name, {
                validators: [Validators.required]
            }),
            description: new FormControl(data.description, {
                validators: [Validators.required]
            })
        });

        this.authenticationService.currentUser.pipe(takeUntil(this.destroy)).subscribe((u) => (this.user = u));
    }

    public save(): void {
        if (!this.form.valid) {
            return;
        }

        this.state = "LOADING";
        this.updateGroup
            .mutate({
                groupSlug: this.data.slug,
                name: this.form.value.name,
                description: this.form.value.description
            })
            .subscribe(
                ({ data, errors }) => {
                    if (errors) {
                        console.error(errors);
                        this.state = "ERROR";
                        return;
                    }

                    this.state = "SUCCESS";
                    this.dialogRef.close(data.updateGroup);
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }
}
