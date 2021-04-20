import { Component, OnInit } from "@angular/core";

@Component({
    selector: "app-admin-dashboard",
    templateUrl: "./admin-dashboard.component.html",
    styleUrls: ["./admin-dashboard.component.scss"]
})
export class AdminDashboardComponent {
    private readonly URL_PREFIX = "/admin";
    public routes = [
        { linkName: "users", url: this.URL_PREFIX },
        { linkName: "platform-settings", url: "/admin/platform-settings" }
    ];

    constructor() {}
}
