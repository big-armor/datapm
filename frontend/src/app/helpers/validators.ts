import { ChangeDetectorRef } from "@angular/core";
import { EmailAddressAvailableGQL, UsernameAvailableGQL } from "src/generated/graphql";
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from "@angular/forms";

export function usernameValidator(
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
