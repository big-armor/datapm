import { Component, OnInit } from "@angular/core";

@Component({
    selector: "app-move-package",
    templateUrl: "./move-package.component.html",
    styleUrls: ["./move-package.component.scss"]
})
export class MovePackageComponent implements OnInit {
    public existCatalog: boolean = false;
    public editPermission: boolean = false;

    constructor() {}

    ngOnInit(): void {}
}
