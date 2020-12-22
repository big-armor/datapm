import { Component, Input, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { PageState } from "src/app/models/page-state";
import { User, UserGQL } from "src/generated/graphql";

@Component({
    selector: "app-user-details",
    templateUrl: "./user-details.component.html",
    styleUrls: ["./user-details.component.scss"]
})
export class UserDetailsComponent implements OnInit {
    public user: User;
    public username: string;
    public state: PageState = "INIT";

    constructor(private userGQL: UserGQL, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.username = this.route.snapshot.paramMap.get("catalogSlug");
        this.userGQL
            .fetch({
                username: this.username
            })
            .subscribe(({ data, errors }) => {
                if (errors) {
                    this.state = "ERROR";
                    return;
                }

                this.user = data.user;
                this.state = "SUCCESS";
            });
    }
}
