import { Component, OnInit } from "@angular/core";

@Component({
    selector: "trending",
    templateUrl: "./trending.component.html",
    styleUrls: ["./trending.component.scss"]
})
export class TrendingComponent implements OnInit {
    public isFavorite = false;

    constructor() {}

    ngOnInit(): void {}

    public makeFavorite(): void {
        this.isFavorite = !this.isFavorite;
    }
}
