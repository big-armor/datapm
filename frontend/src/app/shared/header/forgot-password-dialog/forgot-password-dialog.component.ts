import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import {
    AbstractControl,
    AsyncValidatorFn,
    FormBuilder,
    FormGroup,
    ValidationErrors,
    Validators
} from "@angular/forms";
import { EmailAddressAvailableGQL } from "src/generated/graphql";

enum State {
    INIT,
    AWAITING_RESPONSE,
    REJECTED,
    ERROR,
    SUCCESS,
    ERROR_AFTER_SIGNUP
}

function emailAddressValidator(
    emailAddressAvailableGQL: EmailAddressAvailableGQL,
    componentChangeDetector: ChangeDetectorRef
): AsyncValidatorFn {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            if (control.value == "" || control.value == null) {
                return;
            }
            emailAddressAvailableGQL.fetch({ emailAddress: control.value }).subscribe((result) => {
                if (result.errors?.length > 0) {
                    success({
                        [result.errors[0].message]: true
                    });
                } else {
                    if (result.data.emailAddressAvailable) {
                        success({
                            NOT_AVAILABLE: true
                        });
                    } else {
                        success(null);
                    }
                }
                control.markAllAsTouched();
                componentChangeDetector.detectChanges();
            });
        });
    };
}

@Component({
    selector: "app-forgot-password-dialog",
    templateUrl: "./forgot-password-dialog.component.html",
    styleUrls: ["./forgot-password-dialog.component.scss"]
})
export class ForgotPasswordDialogComponent implements OnInit {
    State = State;

    state = State.INIT;

    form: FormGroup;

    constructor(
        formBuilder: FormBuilder,
        emailAddressAvailableGQL: EmailAddressAvailableGQL,
        componentChangeDetector: ChangeDetectorRef
    ) {
        this.form = formBuilder.group({
            emailAddress: [
                "",
                {
                    validators: [Validators.required, Validators.email],
                    asyncValidators: [emailAddressValidator(emailAddressAvailableGQL, componentChangeDetector)],
                    updateOnBlur: "blur"
                }
            ]
        });
    }

    ngOnInit(): void {}

    formSubmit() {}
}
