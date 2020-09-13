import { Component } from '@angular/core';
import { User } from '../generated/graphql'
import {AuthenticationService} from './services/authentication.service'
import { Router } from '@angular/router';
import { FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'datapm-registry-frontend';

  currentUser:User;
  searchFormGroup:FormGroup;

  constructor(
    private authenticationService:AuthenticationService,
    public router:Router) {}

  ngOnInit() {

    let currentPromise:Promise<User>;

    this.searchFormGroup = new FormGroup({
      search: new FormControl('')
    });

    this.authenticationService.getUserObservable().subscribe((userPromise)=> {
      currentPromise = userPromise;

      if(userPromise == null){
        this.currentUser = null;
        return;
      }

      userPromise.then((user) => {

        // Race condition consideration
        if(currentPromise != userPromise)
          return;

        this.currentUser = user;
      }).catch(error => {
        // nothing to do
      })
    });

  }

  getWelcomeString() {
    if(this.currentUser.firstName != null)
      return this.currentUser.firstName;

    return this.currentUser.username;
  }

  search() {
    const query = this.searchFormGroup.value.search;

    this.router.navigate(['/search',{q: query}])

  }

}
