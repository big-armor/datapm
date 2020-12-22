import { Injectable } from "@angular/core";
import { BehaviorSubject, of } from "rxjs";

import { User, LoginGQL, MeGQL } from "../../generated/graphql";
import { tap, switchMap } from "rxjs/operators";

@Injectable({ providedIn: "root" })
export class AuthenticationService {
    public currentUser: BehaviorSubject<User>;

    constructor(private loginGQL: LoginGQL, private meGQL: MeGQL) {
        this.currentUser = new BehaviorSubject(null);
        this.refreshUserInfo();
    }

    refreshUserInfo() {
        const jwt = localStorage.getItem("jwt");

        if (jwt == null) {
            return;
        }

        // TODO Determine if the jwt is expired

        // TODO - implement refresh tokens

        return this.meGQL.fetch().pipe(
            tap(({ data }) => {
                if (data) {
                    this.currentUser.next(data.me);
                }
            })
        );
    }

    login(username: string, password: string) {
        return this.loginGQL.mutate({ username, password }).pipe(
            switchMap(({ data, errors }) => {
                if (data) {
                    localStorage.setItem("jwt", data.login);
                    return this.refreshUserInfo();
                }

                return of({ errors });
            })
        );
    }

    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem("jwt");
        this.currentUser.next(null);
    }
}
