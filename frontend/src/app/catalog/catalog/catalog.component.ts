import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, ActivatedRouteSnapshot, ParamMap, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { AuthenticationService } from "src/app/services/authentication.service";
import { User, UserGQL } from "src/generated/graphql";

@Component({
    selector: "app-catalog",
    templateUrl: "./catalog.component.html",
    styleUrls: ["./catalog.component.scss"]
})
export class CatalogComponent implements OnInit {
    currentUser: User;
    isPersonal: boolean;
    state: PageState = "INIT";
    private subscription = new Subject();

    constructor(
        private authenticationService: AuthenticationService,
        private route: ActivatedRoute,
        private router: Router,
        private userGQL: UserGQL
    ) {}

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntil(this.subscription)).subscribe((paramMap: ParamMap) => {
            const catalogSlug = paramMap.get("catalogSlug");
            this.state = "LOADING";
            this.userGQL
                .fetch({
                    username: catalogSlug
                })
                .subscribe(({ data, errors }) => {
                    if (data?.user) {
                        this.isPersonal = true;
                    } else {
                        this.isPersonal = false;
                    }

                    this.state = "SUCCESS";
                });
        });
    }

    ngOnDestroy() {
        this.subscription.next();
        this.subscription.complete();
    }
}
