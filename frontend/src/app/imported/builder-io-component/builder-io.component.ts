import { AfterContentChecked, Component, ElementRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { BuilderIOService } from "../resource-importer.service";

@Component({
    selector: "app-builder-io",
    templateUrl: "./builder-io.component.html",
    styleUrls: ["./builder-io.component.scss"]
})
export class BuilderIOComponent implements AfterContentChecked {
    private readonly JAVASCRIPT_ELEMENT_TYPE = "script";
    private readonly JAVASCRIPT_SCRIPT_TYPE = "text/javascript";

    public entry: string;
    public apiKey: string;

    public loaded: boolean;
    public builderTemplate: string;

    private destroy$ = new Subject();

    constructor(
        private builderIOService: BuilderIOService,
        private route: ActivatedRoute,
        private elementRef: ElementRef
    ) {}

    public ngAfterContentChecked(): void {
        this.loadContent();
    }

    private loadContent(): void {
        this.loaded = false;
        this.builderIOService
            .getBuilderIOApiKey()
            .pipe(takeUntil(this.destroy$))
            .subscribe((apiKey) => {
                const pageKey = this.route.snapshot.params.page;
                const entry = this.builderIOService.getTemplateEntryByPageKey(pageKey);

                if (entry) {
                    this.loadJavascriptAndInjectIntoTemplate(apiKey, entry);
                } else {
                    this.loaded = true;
                }
            });
    }

    private loadJavascriptAndInjectIntoTemplate(apiKey: string, entry: string): void {
        this.builderIOService
            .getBuilderIOScript()
            .pipe(takeUntil(this.destroy$))
            .subscribe((js) => {
                this.apiKey = apiKey;
                this.entry = entry;
                this.injectJavascriptIntoTemplate(js);
                this.loaded = true;
            });
    }

    private injectJavascriptIntoTemplate(js: string): void {
        var script = document.createElement(this.JAVASCRIPT_ELEMENT_TYPE);
        script.type = this.JAVASCRIPT_SCRIPT_TYPE;
        script.innerHTML = js;
        this.elementRef.nativeElement.appendChild(script);
    }
}
