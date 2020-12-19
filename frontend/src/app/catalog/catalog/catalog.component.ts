import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, ActivatedRouteSnapshot, ParamMap } from "@angular/router";
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
    isPersonalCatalog = false;
    private subscription = new Subject();

    constructor(private authenticationService: AuthenticationService, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.route.paramMap.subscribe((paramMap: ParamMap) => {
            const catalogSlug = paramMap.get("catalogSlug");
            const username = this.authenticationService.currentUser?.username;
            this.isPersonalCatalog = username && catalogSlug === username;
        });
    }

    ngOnDestroy() {
        this.subscription.next();
        this.subscription.complete();
    }
}
