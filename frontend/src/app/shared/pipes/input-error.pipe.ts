import { Pipe, PipeTransform } from "@angular/core";
import { AbstractControl } from "@angular/forms";
import { map, startWith } from "rxjs/operators";

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
                    console.log(formControl.errors);
                    if (formControl.errors.required) {
                        return messages?.required || "Required field";
                    } else if (formControl.errors.minlength) {
                        return (
                            messages?.minlength ||
                            `Must have more than ${formControl.errors.minlength.requiredLength} characters`
                        );
                    } else if (formControl.errors.email) {
                        return messages?.email || "Invalid format";
                    } else if (formControl.errors.NOT_AVAILABLE) {
                        return messages?.notAvailable || "Not available";
                    }
                }
                return "";
            })
        );
    }
}
