import { Component, OnInit } from "@angular/core";

@Component({
    selector: "app-package-issues",
    templateUrl: "./package-issues.component.html",
    styleUrls: ["./package-issues.component.scss"]
})
export class PackageIssuesComponent implements OnInit {
    constructor() {}

    public rren: boolean = false;

    ngOnInit(): void {}
}
