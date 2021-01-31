import { Injectable } from "@angular/core";
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { AuthenticationService } from "../services/authentication.service";
import { Observable, of } from "rxjs";
import { filter, map } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class AuthGuard implements CanActivate {
    constructor(private router: Router, private authenticationService: AuthenticationService) {}

    public canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        if (this.authenticationService.isLoggedIn.getValue()) {
            if (!this.isAdminRoute(state.url)) {
                return of(true);
            }

            return this.authenticationService.currentUser.pipe(
                filter((user) => user != null),
                map((user) => user.isAdmin)
            );
        } else {
            const returnUrl = state.url.split("#");
            this.router.navigate(["login"], {
                queryParams: {
                    returnUrl: returnUrl[0]
                },
                fragment: returnUrl[1]
            });
            return of(false);
        }
    }

    private isAdminRoute(route: string): boolean {
        return route.startsWith("/admin");
    }
}
