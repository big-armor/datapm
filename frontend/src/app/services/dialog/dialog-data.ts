import { DialogTextOrientation } from "./dialog-text-orientation";

export interface DialogData {
    title: string;
    content: string;
    warning?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    textOrientation?: DialogTextOrientation;
}
