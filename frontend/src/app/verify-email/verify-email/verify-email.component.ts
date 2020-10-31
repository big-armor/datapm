import { Component, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { resultKeyNameFromField } from "@apollo/client/utilities";
import { ToastrService } from "ngx-toastr";
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
        private toastr: ToastrService,
        private dialog: MatDialog
    ) {}

    ngOnInit(): void {}

    formSubmit() {
        const token = this.route.snapshot.queryParamMap.get("t");
        this.verifyEmailAddressGQL.mutate({ token }).subscribe(
            (result) => {
                if (result.errors) {
                    const errorMsg = result.errors[0].message;
                    if (errorMsg === "TOKEN_NOT_VALID") {
                        this.toastr.error("Token is invalid", "Error");
                    } else {
                        this.toastr.error(errorMsg, "Error");
                    }
                    return;
                }
                this.toastr
                    .success("", "Verification success!", {
                        timeOut: 5000
                    })
                    .onHidden.subscribe(() => {
                        this.router.navigateByUrl("/");
                        this.dialog.open(SignUpDialogComponent);
                    });
            },
            (error) => {
                this.toastr.error(extractErrorMsg(error), "Error");
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
