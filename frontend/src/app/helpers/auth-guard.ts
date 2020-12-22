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

    async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        console.log("canActivate", this.authenticationService.currentUser.value);
        const returnUrl = state.url.split("#");
        // const fragment = state.url.split("#")[1];
        // console.log(route.url, fragment);
        if (!this.authenticationService.currentUser.value) {
            // not authorised so return false
            // this.dialog.openLoginDialog();
            this.router.navigate(["login"], {
                queryParams: {
                    returnUrl: returnUrl[0]
                },
                fragment: returnUrl[1]
            });
            return false;
        }

        return true;
    }
}
