import { Injectable } from "@angular/core";
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { AuthenticationService } from "../services/authentication.service";

@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
    constructor(private router: Router, private authenticationService: AuthenticationService) {}

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
