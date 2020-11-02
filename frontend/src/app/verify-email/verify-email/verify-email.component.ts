import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { MatSnackBar, MatSnackBarRef } from "@angular/material/snack-bar";
import { SignUpDialogComponent } from "src/app/shared/header/sign-up-dialog/sign-up-dialog.component";
import { VerifyEmailAddressGQL } from "src/generated/graphql";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";

type VerificationState = "LOADING" | "SUCCESS" | "FAILED";

@Component({
    selector: "app-verify-email",
    templateUrl: "./verify-email.component.html",
    styleUrls: ["./verify-email.component.scss"]
})
export class VerifyEmailComponent implements OnInit {
    state: VerificationState = "LOADING";
    errorMessage: string = "";

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
        if (!token) {
            this.errorMessage = "Token is invalid";
            this.state = "FAILED";
            return;
        }

        this.verifyEmailAddressGQL.mutate({ token }).subscribe(
            (result) => {
                if (result.errors) {
                    const errorMsg = result.errors[0].message;
                    if (errorMsg === "TOKEN_NOT_VALID") {
                        this.errorMessage = "Token is invalid";
                    } else {
                        this.errorMessage = errorMsg;
                    }
                    this.state = "FAILED";
                    return;
                }

                this.state = "SUCCESS";
            },
            (error) => {
                this.errorMessage = extractErrorMsg(error);
                this.state = "FAILED";
            }
        );
    }
    loginClicked() {
        this.dialog.open(LoginDialogComponent, {
            disableClose: true
        });
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
