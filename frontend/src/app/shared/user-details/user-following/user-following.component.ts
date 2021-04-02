import { Component, Input, OnInit } from "@angular/core";

export interface PeriodicElement {
    name: string;
    position: number;
    weight: number;
}

const ELEMENT_DATA: PeriodicElement[] = [
    { position: 1, name: "Hydrogen", weight: 1.0079 },
    { position: 2, name: "Helium", weight: 1.0079 }
];

@Component({
    selector: "app-user-following",
    templateUrl: "./user-following.component.html",
    styleUrls: ["./user-following.component.scss"]
})
export class UserFollowingComponent implements OnInit {
    @Input() username: string;
    @Input() isCurrentUser: boolean;
    displayedColumns: string[] = ["position", "name", "weight"];
    dataSource = ELEMENT_DATA;

    constructor() {}

    ngOnInit(): void {}
}
