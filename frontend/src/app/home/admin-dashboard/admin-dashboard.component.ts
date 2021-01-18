import { Component, OnInit } from "@angular/core";

@Component({
    selector: "app-admin-dashboard",
    templateUrl: "./admin-dashboard.component.html",
    styleUrls: ["./admin-dashboard.component.scss"]
})
export class AdminDashboardComponent implements OnInit {
    private readonly URL_PREFIX = "/admin";
    public routes = [{ linkName: "users", url: this.URL_PREFIX }];

    constructor() {}

    ngOnInit(): void {}
}
