import { AfterContentChecked, Component, ElementRef } from "@angular/core";
import { ResourceImporterService } from "../resource-importer.service";

@Component({
    selector: "app-not-found",
    templateUrl: "./not-found.component.html",
    styleUrls: ["./not-found.component.scss"]
})
export class NotFoundComponent implements AfterContentChecked {
    private readonly PAGE_STATIC_FILE_NAME = "404";

    public html: string;
    public loading: boolean = false;

    constructor(private resourceImporterService: ResourceImporterService, private elementRef: ElementRef) {}

    public ngAfterContentChecked(): void {
        this.loadExternalContent();
    }

    private loadExternalContent(): void {
        this.loading = true;
        this.resourceImporterService.getHtml(this.PAGE_STATIC_FILE_NAME).subscribe(
            (html) => {
                this.html = html;
                this.loadExternalJavascript();
                this.loading = false;
            },
            () => (this.loading = false)
        );
    }

    private loadExternalJavascript(): void {
        this.resourceImporterService.appendBuilderIOScriptToElementRef(this.elementRef);
    }
}
