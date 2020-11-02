import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { MatSnackBar, MatSnackBarRef } from "@angular/material/snack-bar";
import { SignUpDialogComponent } from "src/app/shared/header/sign-up-dialog/sign-up-dialog.component";
import { VerifyEmailAddressGQL } from "src/generated/graphql";

@Component({
    selector: "app-verify-email",
    templateUrl: "./verify-email.component.html",
    styleUrls: ["./verify-email.component.scss"]
})
export class VerifyEmailComponent implements OnInit {
    constructor(
        private verifyEmailAddressGQL: VerifyEmailAddressGQL,
        private route: ActivatedRoute,
        private router: Router,
        private snackbar: MatSnackBar,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {
        this.validateEmail();
    }

    validateEmail() {
        const token = this.route.snapshot.queryParamMap.get("token");
        this.verifyEmailAddressGQL.mutate({ token }).subscribe(
            (result) => {
                if (result.errors) {
                    const errorMsg = result.errors[0].message;
                    let snackbarRef: MatSnackBarRef<any>;
                    if (errorMsg === "TOKEN_NOT_VALID") {
                        snackbarRef = this.snackbar.open("Token is invalid", null, {
                            duration: 5000,
                            panelClass: "notification-error",
                            verticalPosition: "top",
                            horizontalPosition: "right"
                        });
                    } else {
                        snackbarRef = this.snackbar.open(errorMsg, null, {
                            duration: 5000,
                            panelClass: "notification-error",
                            verticalPosition: "top",
                            horizontalPosition: "right"
                        });
                    }
                    snackbarRef.afterDismissed().subscribe(() => {
                        this.router.navigateByUrl("/");
                    });
                    return;
                }

                this.snackbar
                    .open("Verification success!", null, {
                        duration: 5000,
                        panelClass: "notification-success",
                        verticalPosition: "top",
                        horizontalPosition: "right"
                    })
                    .afterDismissed()
                    .subscribe(() => {
                        this.router.navigateByUrl("/");
                        this.dialog.open(SignUpDialogComponent);
                    });
            },
            (error) => {
                this.snackbar
                    .open(extractErrorMsg(error), null, {
                        duration: 5000,
                        panelClass: "notification-error",
                        verticalPosition: "top",
                        horizontalPosition: "right"
                    })
                    .afterDismissed()
                    .subscribe(() => {
                        this.router.navigateByUrl("/");
                    });
            }
        );
    }
}

function extractErrorMsg(error: any) {
    if (error.networkError?.error.errors) {
        return error.networkError?.error.errors[0].message;
    } else if (error.errors) {
        return error.errors[0].message;
    }

    return "Unknown error occured";
}
