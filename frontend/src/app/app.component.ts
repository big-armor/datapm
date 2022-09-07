import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { Router, Scroll } from "@angular/router";
import { delay, filter, takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

import { AuthenticationService } from "./services/authentication.service";
import { CurrentUser } from "../generated/graphql";
import { ViewportScroller } from "@angular/common";

@Component({
    selector: "app-root",
    templateUrl: "./app.component.html",
    styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit, OnDestroy {
    public title = "datapm-registry-frontend";

    currentUser: CurrentUser;
    searchFormGroup: FormGroup;

    private subscription = new Subject();

    constructor(
        private authenticationService: AuthenticationService,
        private router: Router,
        private viewPortScoller: ViewportScroller
    ) {
        this.router.events
            .pipe(filter((e): e is Scroll => e instanceof Scroll))
            .pipe(delay(1)) // <--------------------------- This line
            .subscribe((e) => {
                if (e.position) {
                    // backward navigation
                    // TODO This viewPortScroller seems to have no effect
                    this.viewPortScoller.scrollToPosition(e.position);
                } else if (e.anchor) {
                    // anchor navigation
                    // TODO This viewPortScroller seems to have no effect
                    this.viewPortScoller.scrollToAnchor(e.anchor);
                } else {
                    // forward navigation
                    // this.viewPortScoller.scrollToPosition([0, 0]);

                    // TODO This viewPortScroller seems to have no effect
                    document.body.scrollTop = 0;
                }
            });
    }

    ngOnInit() {
        this.searchFormGroup = new FormGroup({
            search: new FormControl("")
        });

        this.authenticationService.currentUser
            .pipe(takeUntil(this.subscription))
            .subscribe((currentUser: CurrentUser) => {
                this.currentUser = currentUser;
            });
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    getWelcomeString() {
        if (this.currentUser.user.firstName != null) return this.currentUser.user.firstName;

        return this.currentUser.user.username;
    }

    search() {
        const query = this.searchFormGroup.value.search;

        this.router.navigate(["/search", { q: query }]);
    }
}
