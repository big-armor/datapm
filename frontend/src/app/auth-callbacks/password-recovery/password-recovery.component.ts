import { Component, OnInit } from "@angular/core";
import { FormControl, Validators } from "@angular/forms";
import { ActivatedRoute } from "@angular/router";

import { PageState } from "src/app/models/page-state";
import { RecoverMyPasswordGQL } from "src/generated/graphql";

@Component({
    selector: "app-password-recovery",
    templateUrl: "./password-recovery.component.html",
    styleUrls: ["./password-recovery.component.scss"]
})
export class PasswordRecoveryComponent implements OnInit {
    password = new FormControl("", {
        validators: [Validators.required, Validators.minLength(8)],
        updateOn: "blur"
    });
    state: PageState = "SUCCESS";
    error: string = "";

    constructor(private recoverPasswordGQL: RecoverMyPasswordGQL, private route: ActivatedRoute) {}

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
                        this.error = "Error occured. Password reset failed!";
                        this.state = "ERROR";
                        return;
                    }

                    this.state = "SUCCESS";
                },
                () => {
                    this.error = "Error occured. Password reset failed!";
                    this.state = "ERROR";
                }
            );
    }
}
