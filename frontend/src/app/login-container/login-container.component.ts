import { Component, OnInit } from "@angular/core";
// import { MatDialogRef } from "@angular/material/dialog";
import { DialogService } from "../services/dialog/dialog.service";
// import { LoginDialogComponent } from "../shared/header/login-dialog/login-dialog.component";

@Component({
    selector: "app-login-container",
    templateUrl: "./login-container.component.html",
    styleUrls: ["./login-container.component.scss"]
})
export class LoginContainerComponent implements OnInit {
    constructor(private dialog: DialogService) {}

    ngOnInit(): void {
        this.dialog.openLoginDialog();
    }
}
