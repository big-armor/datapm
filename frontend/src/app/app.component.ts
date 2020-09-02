import { Component } from '@angular/core';
import { User } from '../generated/graphql'
import {AuthenticationService} from './services/authentication.service'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'datapm-registry-frontend';

  currentUser:User;

  constructor(
    private authenticationService:AuthenticationService) {}

  ngOnInit() {

    this.authenticationService.currentUser.subscribe((userPromise)=> {
      userPromise.then((user) => {
        this.currentUser = user;
      }).catch(error => {
        // nothing to do
      })
    });

  }
}
