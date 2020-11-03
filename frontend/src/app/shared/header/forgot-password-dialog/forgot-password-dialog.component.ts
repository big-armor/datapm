import { ChangeDetectorRef, Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { EmailAddressAvailableGQL } from "src/generated/graphql";
import { emailAddressValidator } from "src/app/helpers/validators";

enum State {
    INIT,
    AWAITING_RESPONSE,
    REJECTED,
    ERROR,
    SUCCESS,
    ERROR_AFTER_SIGNUP
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
