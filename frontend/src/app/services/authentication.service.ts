import { Injectable } from "@angular/core";
import { BehaviorSubject, of, throwError } from "rxjs";

import { User, LoginGQL, MeGQL, CurrentUser } from "../../generated/graphql";
import { catchError, switchMap, tap } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class AuthenticationService {
    public currentUser: BehaviorSubject<CurrentUser>;
    public isLoggedIn: BehaviorSubject<boolean>;

    constructor(private loginGQL: LoginGQL, private meGQL: MeGQL) {
        this.currentUser = new BehaviorSubject(null);
        const jwt = localStorage.getItem("jwt");
        this.isLoggedIn = new BehaviorSubject(!!jwt);
        this.refreshUserInfo();
    }

    refreshUserInfo() {
        this.getUserInfo().subscribe(() => {});
    }

    login(username: string, password: string) {
        return this.loginGQL.mutate({ username, password }).pipe(
            switchMap(({ data, errors }) => {
                if (data) {
                    localStorage.setItem("jwt", data.login);
                    return this.getUserInfo();
                }

                return of({ errors });
            })
        );
    }

    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem("jwt");
        this.currentUser.next(null);
        this.isLoggedIn.next(false);
    }

    private getUserInfo() {
        const jwt = localStorage.getItem("jwt");

        if (!jwt) {
            return of(null);
        }

        // TODO Determine if the jwt is expired

        // TODO - implement refresh tokens

        return this.meGQL.fetch().pipe(
            tap(({ data }) => {
                if (data) {
                    this.currentUser.next(data.me);
                    this.isLoggedIn.next(true);
                }
            }),
            catchError((err) => {
                this.logout();
                return throwError(err);
            })
        );
    }

    public getAuthorizationHeader() {
        return localStorage.getItem("jwt");
    }
}
