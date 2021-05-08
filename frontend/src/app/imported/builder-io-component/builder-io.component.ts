import { AfterContentChecked, Component, ElementRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { BuilderIOService } from "../resource-importer.service";

@Component({
    selector: "app-builder-io",
    templateUrl: "./builder-io.component.html",
    styleUrls: ["./builder-io.component.scss"]
})
export class BuilderIOComponent implements AfterContentChecked {
    private readonly ENTRY_TAG = "{{entry}}";
    private readonly API_KEY_TAG = "{{apiKey}}";
    private readonly BUILDER_UI_TEMPLATE = `<builder-component name="page" entry="${this.ENTRY_TAG}" api-key="${this.API_KEY_TAG}"></builder-component>`;

    private readonly JAVASCRIPT_ELEMENT_TYPE = "script";
    private readonly JAVASCRIPT_SCRIPT_TYPE = "text/javascript";

    public builderTemplate: string;
    public loading: boolean = false;

    constructor(
        private resourceImporterService: BuilderIOService,
        private route: ActivatedRoute,
        private elementRef: ElementRef
    ) {}

    public ngAfterContentChecked(): void {
        this.loadExternalContent();
    }

    private loadExternalContent(): void {
        this.loading = true;
        this.loadContent();
    }

    private loadContent(): void {
        this.resourceImporterService.getBuilderIOScript().subscribe(
            (js) => {
                this.injectJavascriptIntoTemplate(js);
                this.loadPageEntryAndApiKey();
            },
            () => (this.loading = false)
        );
    }

    private injectJavascriptIntoTemplate(js: string): void {
        var script = document.createElement(this.JAVASCRIPT_ELEMENT_TYPE);
        script.type = this.JAVASCRIPT_SCRIPT_TYPE;
        script.innerHTML = js;
        this.elementRef.nativeElement.appendChild(script);
    }

    private loadPageEntryAndApiKey(): void {
        this.resourceImporterService.getBuilderIOApiKey().subscribe(
            (apiKey) => {
                const pageKey = this.route.snapshot.params.page;
                const pageEntry = this.resourceImporterService.getTemplateEntryByPageKey(pageKey);
                if (pageEntry) {
                    this.builderTemplate = this.BUILDER_UI_TEMPLATE.replace(this.API_KEY_TAG, apiKey).replace(
                        this.ENTRY_TAG,
                        pageEntry
                    );
                }

                this.loading = false;
            },
            () => (this.loading = false)
        );
    }
}
