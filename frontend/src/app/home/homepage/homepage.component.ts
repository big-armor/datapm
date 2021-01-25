import { Component, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthenticationService } from "src/app/services/authentication.service";
import { User } from "src/generated/graphql";

@Component({
    selector: "home",
    templateUrl: "./homepage.component.html",
    styleUrls: ["./homepage.component.scss"]
})
export class HomepageComponent implements OnInit {
    private unsubscribe$ = new Subject();
    public currentUser: User;

    public routes = [
        // {linkName:'trending',url:'/trending'},
        { linkName: "latest", url: "", authRequired: false },
        { linkName: "recently viewed", url: "/viewed", authRequired: true }
        // {linkName:'premium',url:'/premium'},
    ];

    constructor(private authenticationService: AuthenticationService) {}

    ngOnInit(): void {
        this.authenticationService.currentUser.pipe(takeUntil(this.unsubscribe$)).subscribe((user: User) => {
            this.currentUser = user;
        });
    }
}
