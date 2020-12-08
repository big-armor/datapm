import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
    providedIn: "root"
})
export class DialogService {
    actions = new Subject<string>();

    constructor() {}

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
}
