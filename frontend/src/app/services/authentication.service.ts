import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { User, LoginGQL, MeGQL } from '../../generated/graphql';
import Maybe from 'graphql/tsutils/Maybe';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {

    private currentUserSubject: BehaviorSubject<Promise<Maybe<User>>>;
    private _currentUser: User;
    private _currentUserPromise: Promise<User>;

    constructor(private loginGQL:LoginGQL,
        private meGQL:MeGQL) {
            this.currentUserSubject = new BehaviorSubject(this.refreshUserInfo());
        }

    public get currentUser(): Maybe<User> {
        return this._currentUser;
    }
    
    public get currentUserPromise():Promise<Maybe<User>> {
        return this._currentUserPromise;
    }

    public getUserObservable() {
        return this.currentUserSubject.asObservable();
    }

    refreshUserInfo():Promise<Maybe<User>> {
        this._currentUserPromise = new Promise((result,reject) => {

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
                    this._currentUser = me;
                    this.currentUserSubject.next(Promise.resolve(me));
                    result(me);
                }

                
            });


        });

        return this._currentUserPromise;
    }

    login(username: string, password: string):Promise<Maybe<User>> {

        return new Promise((result, reject) => {

            this.loginGQL.mutate({username,password}).toPromise().then((response) => {
                
                if(response.errors) {
                    reject(response.errors);
                    return;
                }

                const jwt = response.data.login;
                localStorage.setItem('jwt',jwt);

                this.refreshUserInfo().then(user => {result(user)});
            }).catch((error) => {
                console.error(error)
                reject(error);
            })

        })

        
    }

    logout() {
        // remove user from local storage to log user out
        localStorage.removeItem('jwt');
        this.currentUserSubject.next(null);
    }

    setJwt(login: string):Promise<User | null> {
        localStorage.setItem('jwt',login);
        return this.refreshUserInfo();
      }
}