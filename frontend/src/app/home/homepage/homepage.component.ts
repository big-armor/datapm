import { Component, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthenticationService } from "src/app/services/authentication.service";
import { CurrentUser, User } from "src/generated/graphql";

@Component({
    selector: "home",
    templateUrl: "./homepage.component.html",
    styleUrls: ["./homepage.component.scss"]
})
export class HomepageComponent implements OnInit {
    public readonly routes = [
        { linkName: "latest", url: "", authRequired: false },
        { linkName: "following", url: "/following", authRequired: true },
        { linkName: "recently viewed", url: "/viewed", authRequired: true }
    ];
    private readonly unsubscribe$ = new Subject();

    public currentUser: CurrentUser;

    constructor(private authenticationService: AuthenticationService) {}

    public ngOnInit(): void {
        this.authenticationService.currentUser
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((user: CurrentUser) => (this.currentUser = user));
    }
}
