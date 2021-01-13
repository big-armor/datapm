import { Injectable } from "@angular/core";
import { Observable, Subject } from "rxjs";
import { ConfirmationDialogService } from "./confirmation-dialog.service";

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

    public openCatalogVisibilityChangeConfirmationDialog(): Observable<boolean> {
        const dialogConfig = {
            data: {
                title: "Are you sure?",
                warning: "Unexpected bad things will happen if you don’t read this!",
                content:
                    "All packages in this catalog will be marked private, and any that were previously public will no " +
                    "longer be accessible without specific access permissions"
            }
        };

        return this.confirmationDialogService.openFancyConfirmationDialog(dialogConfig);
    }
}
