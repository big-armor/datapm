import { ChangeDetectorRef } from "@angular/core";
import { EmailAddressAvailableGQL, UsernameAvailableGQL } from "src/generated/graphql";
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from "@angular/forms";

export function usernameValidator(
    usernameAvailableGQL: UsernameAvailableGQL,
    componentChangeDetector: ChangeDetectorRef,
    currentUsername: string
): AsyncValidatorFn {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }
            if (control.value == currentUsername) {
                success(null);
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

export function emailAddressValidator(
    emailAddressAvailableGQL: EmailAddressAvailableGQL,
    componentChangeDetector: ChangeDetectorRef,
    checkAvailable?: boolean
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
                    if (
                        (result.data.emailAddressAvailable && checkAvailable) ||
                        (!result.data.emailAddressAvailable && !checkAvailable)
                    ) {
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

export function newPasswordValidator() {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            const regex = /[0-9@#$%!]/;

            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }
            if (control.value.length > 99) {
                success({
                    PASSWORD_TOO_LONG: true
                });
            }
            if (control.value.length < 8) {
                success({
                    PASSWORD_TOO_SHORT: true
                });
            }
            if (control.value.length < 16 && control.value.match(regex) == null) {
                success({
                    INVALID_CHARACTERS: true
                });
            }
        });
    };
}

export function slugValidator() {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            const regex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?$/;

            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }
            if (control.value.length > 40) {
                success({
                    SLUG_TOO_LONG: true
                });
            }
            if (!regex.test(control.value)) {
                success({
                    INVALID_CHARACTERS: true
                });
            }

            success(null);
        });
    };
}
