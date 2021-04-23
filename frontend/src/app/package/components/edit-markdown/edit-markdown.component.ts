import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

@Component({
    selector: "app-edit-markdown",
    templateUrl: "./edit-markdown.component.html",
    styleUrls: ["./edit-markdown.component.scss"]
})
export class EditMarkdownComponent implements OnInit {
    constructor(private router: Router, private route: ActivatedRoute) {}

    ngOnInit(): void {}

    public goBack(): void {
        this.router.navigate(["../"], { relativeTo: this.route });
    }
}
