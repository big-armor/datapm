import { AfterContentChecked, Component, ElementRef } from "@angular/core";
import { ResourceImporterService } from "../resource-importer.service";

@Component({
    selector: "app-contact",
    templateUrl: "./contact.component.html",
    styleUrls: ["./contact.component.scss"]
})
export class ContactComponent implements AfterContentChecked {
    private readonly PAGE_STATIC_FILE_NAME = "contact";

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
