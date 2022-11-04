import { ChangeDetectorRef } from "@angular/core";
import { EmailAddressAvailableGQL, UsernameAvailableGQL } from "src/generated/graphql";
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from "@angular/forms";
import { catalogSlugValid, collectionSlugValid, packageSlugValid, passwordValid, validPackageDescription, validPackageDisplayName } from "datapm-lib";

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
            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }

            const validSlug = passwordValid(control.value);

            if (validSlug !== true) {
                const responseObject = {};
                responseObject[validSlug] = true;
                success(responseObject);
                return;
            }

            success(null);
        });
    };
}

export function catalogSlugValidator() {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {

            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }

            const validSlug = catalogSlugValid(control.value);

            if(validSlug !== true) {
                const responseObject = {};
                responseObject[validSlug] = true;
                success(responseObject);
                return;
            }

            success(null);
        });
    };
}

export function packageSlugValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
        if (control.value == "" || control.value == null) {
            return {
                REQUIRED: true
            };
        }

        const validSlug = packageSlugValid(control.value);

        if (validSlug !== true) {
            const responseObject = {};
            responseObject[validSlug] = { value: control.value };
            return responseObject;
        }

        return null;
    };
}

export function packageDisplayNameValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
        if (control.value == "" || control.value == null) {
            return {
                REQUIRED: true
            };
        }

        const valid = validPackageDisplayName(control.value);

        if (valid !== true) {
            const responseObject = {};
            responseObject[valid] = { value: control.value };
            return responseObject;
        }

        return null;
    };
}

export function packageDescriptionValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
        if (control.value == "" || control.value == null) {
            return {
                REQUIRED: true
            };
        }

        const valid = validPackageDescription(control.value);

        if (valid !== true) {
            const responseObject = {};
            responseObject[valid] = { value: control.value };
            return responseObject;
        }

        return null;
    };
}

export function collectionSlugValidator() {
    return (control: AbstractControl): Promise<ValidationErrors | null> => {
        return new Promise<ValidationErrors | null>((success, error) => {
            if (control.value == "" || control.value == null) {
                success({
                    REQUIRED: true
                });
                return;
            }

            const validSlug = collectionSlugValid(control.value);

            if (validSlug !== true) {
                const responseObject = {};
                responseObject[validSlug] = true;
                success(responseObject);
                return;
            }

            success(null);
        });
    };
}
