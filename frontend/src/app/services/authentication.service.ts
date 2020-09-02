import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { User, LoginGQL, MeGQL } from '../../generated/graphql';
import Maybe from 'graphql/tsutils/Maybe';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {

    private currentUserSubject: BehaviorSubject<Promise<Maybe<User>>>;
    public currentUser: Observable<Promise<User>>;

    constructor(private loginGQL:LoginGQL,
        private meGQL:MeGQL) {
            this.currentUserSubject = new BehaviorSubject(this.refreshUserInfo());
            this.currentUser = this.currentUserSubject.asObservable();
        }

    public get currentUserValue(): Promise<Maybe<User>> {
        return this.currentUserSubject.value;
    }

    refreshUserInfo():Promise<Maybe<User>> {
        return new Promise((result,reject) => {

            const jwt = localStorage.getItem('jwt');

            if(jwt == null) {
                result(null);
                return;
            }

            this.meGQL.fetch().subscribe(observer => {

                if(observer.errors?.length > 0) {
                    reject(observer.error);
                } else {
                    const me = observer.data.me;
                    result(me);
                }

                
            });


        })
    }

    login(username: string, password: string) {

        this.loginGQL.mutate({username,password}).subscribe((result) => {
            if(result.errors) {

            } else {
                const jwt = result.data.login;
                localStorage.setItem('jwt',jwt);

            }
        });
        
    }

    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem('jwt');
        this.currentUserSubject.next(null);
    }

    setJwt(login: string) {
        localStorage.setItem('jwt',login);
        this.refreshUserInfo();
      }
}