import { Component, Input, OnInit } from "@angular/core";
import { User } from "src/generated/graphql";

@Component({
    selector: "app-user-details-header",
    templateUrl: "./user-details-header.component.html",
    styleUrls: ["./user-details-header.component.scss"]
})
export class UserDetailsHeaderComponent implements OnInit {
    @Input() user: User;

    constructor() {}

    ngOnInit(): void {}
}
