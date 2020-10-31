import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { AbstractControl, AsyncValidatorFn, FormControl, FormGroup, ValidationErrors } from "@angular/forms";
import { ToastrService } from "ngx-toastr";
import { Router } from "@angular/router";
import { MatDialogRef } from "@angular/material/dialog";
import { AuthenticationService } from "src/app/services/authentication.service";
import { CreateMeGQL, EmailAddressAvailableGQL, UsernameAvailableGQL } from "src/generated/graphql";

enum State {
    INIT,
    AWAITING_RESPONSE,
    REJECTED,
    ERROR,
    SUCCESS,
    ERROR_AFTER_SIGNUP
}

function usernameValidator(
    usernameAvailableGQL: UsernameAvailableGQL,
    componentChangeDetector: ChangeDetectorRef
): AsyncValidatorFn {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }
            usernameAvailableGQL.fetch({ username: control.value }).subscribe((result) => {
                if (result.errors?.length > 0) {
                    success({
                        [result.errors[0].message]: true
                    });
                } else {
                    if (result.data.usernameAvailable) {
                        success(null);
                    } else {
                        success({
                            NOT_AVAILABLE: true
                        });
                    }
                }
                control.markAsDirty();
                componentChangeDetector.detectChanges();
            });
        });
    };
}

function emailAddressValidator(
    emailAddressAvailableGQL: EmailAddressAvailableGQL,
    componentChangeDetector: ChangeDetectorRef
): AsyncValidatorFn {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }
            emailAddressAvailableGQL.fetch({ emailAddress: control.value }).subscribe((result) => {
                if (result.errors?.length > 0) {
                    success({
                        [result.errors[0].message]: true
                    });
                } else {
                    if (result.data.emailAddressAvailable) {
                        success(null);
                    } else {
                        success({
                            NOT_AVAILABLE: true
                        });
                    }
                }
                control.markAllAsTouched();
                componentChangeDetector.detectChanges();
            });
        });
    };
}
@Component({
    selector: "app-sign-up-dialog",
    templateUrl: "./sign-up-dialog.component.html",
    styleUrls: ["./sign-up-dialog.component.scss"]
})
export class SignUpDialogComponent implements OnInit {
    State = State;

    state = State.INIT;

    signUpForm: FormGroup;

    constructor(
        private router: Router,
        private authenticationService: AuthenticationService,
        private createMeGQL: CreateMeGQL,
        private usernameAvailableGQL: UsernameAvailableGQL,
        private emailAddressAvailableGQL: EmailAddressAvailableGQL,
        private componentChangeDetector: ChangeDetectorRef,
        private dialogRef: MatDialogRef<SignUpDialogComponent>,
        private toastr: ToastrService
    ) {}

    ngOnInit(): void {
        this.signUpForm = new FormGroup({
            username: new FormControl(""),
            emailAddress: new FormControl(""),
            password: new FormControl("")
        });
    }

    formSubmit() {
        this.createMeGQL
            .mutate({
                value: {
                    username: this.signUpForm.value.username,
                    password: this.signUpForm.value.password,
                    emailAddress: this.signUpForm.value.emailAddress
                }
            })
            .toPromise()
            .then((result) => {
                if (result.errors) {
                    const errorMsg = result.errors[0].message;

                    if (errorMsg.startsWith("duplicate key value")) {
                        this.signUpForm.get("emailAddress").setErrors({ NOT_AVAILABLE: true });
                    } else if (errorMsg.match(/^Catalog .+ already exists$/)) {
                        this.signUpForm.get("username").setErrors({ NOT_AVAILABLE: true });
                    } else {
                        this.toastr.error(errorMsg, "Error");
                    }

                    return;
                }

                this.dialogRef.close();
                this.router.navigateByUrl("/");
                this.toastr.success("Please check your email for next steps.", "Sign up complete!");
            })
            .catch(() => {
                this.toastr.error("Unknown error", "Error");
            });
    }

    openForgotPassword() {
        this.dialogRef.close("forgotPassword");
    }

    clearError(field: string) {
        const control = this.signUpForm.get(field);
        if (control.errors !== null) {
            control.setErrors(null);
            this.componentChangeDetector.detectChanges();
        }
    }
}
