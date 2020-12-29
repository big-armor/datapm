import { Component, OnInit } from "@angular/core";
import { FormControl, Validators } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute } from "@angular/router";

import { PageState } from "src/app/models/page-state";
import { newPasswordValidator } from "src/app/helpers/validators";
import { LoginDialogComponent } from "src/app/shared/header/login-dialog/login-dialog.component";
import { RecoverMyPasswordGQL } from "src/generated/graphql";

@Component({
    selector: "app-password-recovery",
    templateUrl: "./password-recovery.component.html",
    styleUrls: ["./password-recovery.component.scss"]
})
export class PasswordRecoveryComponent implements OnInit {
    password = new FormControl("", {
        asyncValidators: [newPasswordValidator()]
    });
    passwordResetState: PageState = "INIT";
    error: string = "";

    constructor(
        private recoverPasswordGQL: RecoverMyPasswordGQL,
        private route: ActivatedRoute,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {}

    submit() {
        const token = this.route.snapshot.queryParamMap.get("token");
        this.recoverPasswordGQL
            .mutate({
                value: {
                    newPassword: this.password.value,
                    token
                }
            })
            .subscribe(
                (response) => {
                    if (response.errors) {
                        this.error =
                            "An error occured. Please try to login and use the 'forgot password' link again. Or contact support.";
                        this.passwordResetState = "ERROR";
                        return;
                    }

                    this.passwordResetState = "SUCCESS";
                },
                () => {
                    this.error =
                        "An error occured. Please try to login and use the 'forgot password' link again. Or contact support.";
                    this.passwordResetState = "ERROR";
                }
            );
    }

    login() {
        this.dialog.open(LoginDialogComponent);
    }
}
