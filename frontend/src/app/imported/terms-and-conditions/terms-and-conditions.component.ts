import { Component, OnInit } from "@angular/core";
import { ResourceImporterService } from "../resource-importer.service";

@Component({
    selector: "app-terms-and-conditions",
    templateUrl: "./terms-and-conditions.component.html",
    styleUrls: ["./terms-and-conditions.component.scss"]
})
export class TermsAndConditionsComponent implements OnInit {
    private readonly PAGE_STATIC_FILE_NAME = "terms";

    public html: string;
    public loading: boolean = false;

    constructor(private resourceImporterService: ResourceImporterService) {}

    public ngOnInit(): void {
        this.loadExternalHtml();
    }

    private loadExternalHtml(): void {
        this.loading = true;
        this.resourceImporterService.getHtml(this.PAGE_STATIC_FILE_NAME).subscribe(
            (html) => {
                this.html = html;
                this.loading = false;
            },
            () => {
                this.loading = false;
            }
        );
    }
}
