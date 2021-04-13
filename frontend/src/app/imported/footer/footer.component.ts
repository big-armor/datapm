import { Component, OnInit } from "@angular/core";
import { ResourceImporterService } from "../resource-importer.service";

@Component({
    selector: "app-footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"]
})
export class FooterComponent implements OnInit {
    private readonly PAGE_STATIC_FILE_NAME = "footer";

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
