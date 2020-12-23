import { Injectable } from "@angular/core";
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { DialogService } from "../services/dialog.service";
import { AuthenticationService } from "../services/authentication.service";

@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService,
        private dialog: DialogService
    ) {}

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if (this.authenticationService.isLoggedIn.getValue()) return true;
        const returnUrl = state.url.split("#");
        this.router.navigate(["login"], {
            queryParams: {
                returnUrl: returnUrl[0]
            },
            fragment: returnUrl[1]
        });
        return false;
    }
}
