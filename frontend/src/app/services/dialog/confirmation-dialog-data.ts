import { DialogTextOrientation } from "./dialog-text-orientation";

export interface ConfirmationDialogData {
    title: string;
    content: string;
    warning?: string;
    showConfirmationInputField?: boolean;
    confirmationInputFieldRequiredValue?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    textOrientation?: DialogTextOrientation;
}
