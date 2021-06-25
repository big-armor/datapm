import { Component, OnInit } from "@angular/core";
import { User } from "src/generated/graphql";

@Component({
    selector: "app-followers",
    templateUrl: "./followers.component.html",
    styleUrls: ["./followers.component.scss"]
})
export class FollowersComponent implements OnInit {
    user = {
        username: "ermali"
    };

    user1 = {
        username: "bleonatest4"
    };

    user2 = {
        username: "ermalitest6"
    };

    constructor() {}

    ngOnInit(): void {}
}
