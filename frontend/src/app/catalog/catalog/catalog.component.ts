import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, ActivatedRouteSnapshot, ParamMap, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AuthenticationService } from "src/app/services/authentication.service";
import { User } from "src/generated/graphql";

@Component({
    selector: "app-catalog",
    templateUrl: "./catalog.component.html",
    styleUrls: ["./catalog.component.scss"]
})
export class CatalogComponent implements OnInit {
    currentUser: User;
    private subscription = new Subject();

    constructor(
        private authenticationService: AuthenticationService,
        private route: ActivatedRoute,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntil(this.subscription)).subscribe((paramMap: ParamMap) => {
            const catalogSlug = paramMap.get("catalogSlug");
            const username = this.authenticationService.currentUser.value?.username;
            if (username && catalogSlug === username) {
                this.router.navigate(["/user", catalogSlug]);
            }
        });
    }

    ngOnDestroy() {
        this.subscription.next();
        this.subscription.complete();
    }
}
