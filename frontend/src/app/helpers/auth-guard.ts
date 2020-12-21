import { Injectable } from "@angular/core";
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";

import { AuthenticationService } from "../services/authentication.service";

@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
    constructor(private router: Router, private authenticationService: AuthenticationService) {}

    async canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        console.log("canActivate", this.authenticationService.currentUser.value);
        if (this.authenticationService.currentUser.value) {
            // authorised so return true
            return true;
        }

        return false;
    }
}
