import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Observable, Subject } from "rxjs";
import { FetchModalComponent, FetchModalData } from "src/app/shared/command-modal/fetch/fetch-modal.component";
import { PackageModalComponent, PackageModalData } from "src/app/shared/command-modal/package/package-modal.component";
import { ConfirmationDialogService } from "./confirmation-dialog.service";
import { DialogConfig } from "./dialog-config";
import { DialogSize } from "./dialog-size";

@Injectable({
    providedIn: "root"
})
export class DialogService {
    actions = new Subject<string>();

    constructor(private confirmationDialogService: ConfirmationDialogService, private matDialog: MatDialog) {}

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

    openPackageCommandDialog(data: PackageModalData) {
        this.matDialog.open(PackageModalComponent, {
            data,
            width: "90vw",
            maxWidth: "800px",
            height: "90vh",
            maxHeight: "600px",
            disableClose: true,
            panelClass: "command-modal"
        });
    }

    openFetchCommandDialog(data: FetchModalData) {
        this.matDialog.open(FetchModalComponent, {
            data,
            width: "90vw",
            maxWidth: "800px",
            height: "90vh",
            maxHeight: "600px",
            disableClose: true,
            panelClass: "command-modal"
        });
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
                " unless they have specific permissions.";
            confirmText = "Disable Public Access";
        }

        const dialogConfig: DialogConfig = {
            data: {
                title: "Are you sure?",
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
                "longer be accessible without providing other users specific access permissions.";
            confirmText = "Disable Public Access";
        }

        const dialogConfig = {
            data: {
                title: "Are you sure?",
                content: message,
                confirmButtonText: confirmText
            },
            size: DialogSize.MEDIUM
        };

        return this.confirmationDialogService.openFancyConfirmationDialog(dialogConfig);
    }

    public openCatalogUnclaimedStatusConfirmationDialog(unclaimed: boolean): Observable<boolean> {
        let message: string;
        let confirmText: string;
        if (unclaimed) {
            message = "<p>This catalog will become claimed.</p>";
            confirmText = "Set as claimed";
        } else {
            message = "<p>This catalog will become unclaimed.</p>";
            confirmText = "Set as unclaimed";
        }

        const dialogConfig = {
            data: {
                title: "Are you sure?",
                content: message,
                confirmButtonText: confirmText
            },
            size: DialogSize.MEDIUM
        };

        return this.confirmationDialogService.openFancyConfirmationDialog(dialogConfig);
    }
}
