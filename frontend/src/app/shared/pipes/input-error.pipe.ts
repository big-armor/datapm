import { Pipe, PipeTransform } from "@angular/core";
import { AbstractControl } from "@angular/forms";
import { merge } from "rxjs";
import { map } from "rxjs/operators";

const defaultMessages = {
    required: (errors: any) => "Required field",
    REQUIRED: (errors: any) => "Required field",
    minlength: (errors: any) => `Must have more than ${errors.minlength.requiredLength} characters`,
    email: (errors: any) => "Invalid format",
    pattern: (errors: any) => "Invalid format",
    NOT_AVAILABLE: (errors: any) => "Not available",
    PASSWORD_TOO_SHORT: (errors: any) => "Password is too short",
    PASSWORD_TOO_LONG: (errors: any) => "Password is too long",
    INVALID_CHARACTERS: (errors: any) =>
        "Passwords less than 16 characters must include one number or a special character (@ # $ % !)",
    RESERVED_KEYWORD: (errors: any) => "This is a reserved keyword. Please choose a different word"
};

const errorKeys = [
    "required",
    "REQUIRED",
    "minlength",
    "email",
    "pattern",
    "PASSWORD_TOO_SHORT",
    "PASSWORD_TOO_LONG",
    "INVALID_CHARACTERS",
    "USERNAME_TOO_LONG",
    "NOT_AVAILABLE",
    "RESERVED_KEYWORD"
];

@Pipe({
    name: "inputError"
})
export class InputErrorPipe implements PipeTransform {
    private formControl: AbstractControl;
    private messages: any;

    transform(control: AbstractControl, controlName?: string, messages?: any): any {
        this.formControl = control as AbstractControl;
        if (controlName) {
            this.formControl = control.get(controlName);
        }
        this.messages = messages;

        let statusChanges = this.formControl.statusChanges;
        if (controlName) {
            statusChanges = merge(statusChanges, control.statusChanges);
        }

        return statusChanges.pipe(map(() => this.checkError()));
    }

    private checkError() {
        if (this.formControl && this.formControl.touched && this.formControl.errors) {
            for (let i = 0; i < errorKeys.length; i++) {
                const key = errorKeys[i];
                if (this.formControl.errors[key]) {
                    return (
                        (this.messages && this.messages[key]) ||
                        (defaultMessages[key] && defaultMessages[key](this.formControl.errors[key])) ||
                        ""
                    );
                }
            }
        }
        return "";
    }
}
