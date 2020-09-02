import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { User, LoginGQL, MeGQL } from '../../generated/graphql';
import Maybe from 'graphql/tsutils/Maybe';

@Injectable({ providedIn: 'root' })
export class AuthenticationService {

    private currentUserSubject: BehaviorSubject<Promise<Maybe<User>>>;

    constructor(private loginGQL:LoginGQL,
        private meGQL:MeGQL) {
            this.currentUserSubject = new BehaviorSubject(this.refreshUserInfo());
        }

    public get currentUserValue(): Promise<Maybe<User>> {
        return this.currentUserSubject.value;
    }
    
    public getUserObservable() {
        return this.currentUserSubject.asObservable();
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
                    this.currentUserSubject.next(Promise.resolve(me));
                    result(me);
                }

                
            });


        })
    }

    login(username: string, password: string):Promise<Maybe<User>> {

        return new Promise((result, reject) => {

            this.loginGQL.mutate({username,password}).subscribe((graphqlResult) => {
                if(graphqlResult.errors) {
                    console.error(graphqlResult)
                    reject(graphqlResult.errors);
                } else {
                    const jwt = graphqlResult.data.login;
                    localStorage.setItem('jwt',jwt);
    
                    this.refreshUserInfo().then(user => {result(user)});
                }
            });

        })

        
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