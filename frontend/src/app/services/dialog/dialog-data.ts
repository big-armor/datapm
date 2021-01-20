import { DialogTextOrientation } from "./dialog-text-orientation";

export interface DialogData {
    title: string;
    content: string;
    warning?: string;
    showConfirmationInputField?: boolean;
    confirmationInputFieldText?: string;
    confirmationInputFieldRequiredValue?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    textOrientation?: DialogTextOrientation;
}
