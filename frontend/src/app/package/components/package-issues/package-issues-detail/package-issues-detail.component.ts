import { Component, OnInit } from "@angular/core";

@Component({
    selector: "app-package-issues-detail",
    templateUrl: "./package-issues-detail.component.html",
    styleUrls: ["./package-issues-detail.component.scss"]
})
export class PackageIssuesDetailComponent implements OnInit {
    constructor() {}

    ngOnInit(): void {}

    public deleteIssue(): void {
        console.log("hhehe");
    }
}
