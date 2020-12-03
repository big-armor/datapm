import { Pipe, PipeTransform } from "@angular/core";
import { AbstractControl } from "@angular/forms";
import { map, startWith } from "rxjs/operators";

const defaultMessages = {
    required: (errors: any) => "Required field",
    REQUIRED: (errors: any) => "Required field",
    minlength: (errors: any) => `Must have more than ${errors.minlength.requiredLength} characters`,
    email: (errors: any) => "Invalid format",
    NOT_AVAILABLE: (errors: any) => "Not available",
    PASSWORD_TOO_SHORT: (errors: any) => "Password is too short",
    PASSWORD_TOO_LONG: (errors: any) => "Password is too long",
    INVALID_CHARACTERS: (errors: any) =>
        "Passwords less than 16 characters must include one number or a special character (@ # $ % !)"
};

const errorKeys = [
    "required",
    "REQUIRED",
    "minlength",
    "email",
    "PASSWORD_TOO_SHORT",
    "PASSWORD_TOO_LONG",
    "INVALID_CHARACTERS",
    "USERNAME_TOO_LONG",
    "NOT_AVAILABLE"
];

@Pipe({
    name: "inputError"
})
export class InputErrorPipe implements PipeTransform {
    transform(control: AbstractControl, controlName?: string, messages?: any): any {
        let formControl = control as AbstractControl;
        if (controlName) {
            formControl = control.get(controlName);
        }

        return formControl.statusChanges.pipe(
            map(() => {
                if (formControl.dirty && formControl.errors) {
                    for (let i = 0; i < errorKeys.length; i++) {
                        const key = errorKeys[i];
                        if (formControl.errors[key]) {
                            return (
                                (messages && messages[key]) ||
                                (defaultMessages[key] && defaultMessages[key](formControl.errors[key])) ||
                                ""
                            );
                        }
                    }
                }
                return "";
            })
        );
    }
}
