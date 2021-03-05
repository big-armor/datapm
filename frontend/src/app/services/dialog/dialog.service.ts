import { Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { ConfirmationDialogService } from "./confirmation-dialog.service";
import { DialogConfig } from "./dialog-config";
import { DialogSize } from "./dialog-size";

@Injectable({
    providedIn: "root"
})
export class DialogService {
    actions = new Subject<string>();

    constructor(private confirmationDialogService: ConfirmationDialogService) {}

    openLoginDialog() {
        this.actions.next("login");
    }

    openForgotPasswordDialog() {
        this.actions.next("forgotPassword");
    }

    openSignupDialog() {
        this.actions.next("signup");
    }

    closeAll() {
        this.actions.next("closeAll");
    }

    public openPackageVisibilityChangeConfirmationDialog(isPublic: boolean): Observable<boolean> {
        let message: string;
        let confirmText: string;
        if (isPublic) {
            message = "<p>You're about to make this package available to anyone who can access this registry.</p>";
            confirmText = "Allow Public Access";
        } else {
            message =
                "This package will be marked private and will not be available to other users in this registry" +
                " unless they have specific permissions set";
            confirmText = "Disable Public Access";
        }

        const dialogConfig: DialogConfig = {
            data: {
                title: "Are you sure?",
                warning: "Unexpected bad things will happen if you don’t read this!",
                content: message,
                confirmButtonText: confirmText
            },
            size: DialogSize.MEDIUM
        };

        return this.confirmationDialogService.openFancyConfirmationDialog(dialogConfig);
    }

    public openCatalogVisibilityChangeConfirmationDialog(isPublic: boolean): Observable<boolean> {
        let message: string;
        let confirmText: string;
        if (isPublic) {
            message =
                "<p>You're about to make this catalog available to anyone who can access this registry.</p>" +
                "<p>Public access applies only to the catalog details. You will need to set each package public if you wish to do so.</p>";
            confirmText = "Allow Public Access";
        } else {
            message =
                "All packages in this catalog will be marked private, and any that were previously public will no " +
                "longer be accessible without specific access permissions.";
            confirmText = "Disable Public Access";
        }

        const dialogConfig = {
            data: {
                title: "Are you sure?",
                warning: "Unexpected bad things will happen if you don’t read this!",
                content: message,
                confirmButtonText: confirmText
            },
            size: DialogSize.MEDIUM
        };

        return this.confirmationDialogService.openFancyConfirmationDialog(dialogConfig);
    }
}
