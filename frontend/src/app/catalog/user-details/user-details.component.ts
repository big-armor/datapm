import { Component, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { AuthenticationService } from "src/app/services/authentication.service";
import { User } from "src/generated/graphql";

@Component({
    selector: "app-user-details",
    templateUrl: "./user-details.component.html",
    styleUrls: ["./user-details.component.scss"]
})
export class UserDetailsComponent implements OnInit {
    public currentUser: User;
    public state: PageState = "LOADING";
    private subscription = new Subject();

    constructor(private authenticationService: AuthenticationService) {}

    ngOnInit(): void {
        this.authenticationService
            .getUserObservable()
            .pipe(takeUntil(this.subscription))
            .subscribe((u) => {
                if (u == null) {
                    return;
                }
                u.then((user) => {
                    this.currentUser = user;
                    this.state = "SUCCESS";
                }).catch((error) => (this.state = "ERROR"));
            });
    }

    ngOnDestroy() {
        this.subscription.next();
        this.subscription.complete();
    }
}
