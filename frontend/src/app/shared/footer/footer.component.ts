import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { BuilderIOService } from "src/app/imported/resource-importer.service";
import { UiStyleToggleService } from "src/app/services/ui-style-toggle.service";

@Component({
    selector: "sd-footer",
    templateUrl: "./footer.component.html",
    styleUrls: ["./footer.component.scss"]
})
export class FooterComponent implements OnInit, OnDestroy, AfterViewInit {
    private readonly destroy = new Subject<void>();

    private readonly JAVASCRIPT_ELEMENT_TYPE = "script";
    private readonly JAVASCRIPT_SCRIPT_TYPE = "text/javascript";

    private readonly BUILDER_IO_ENTRY_KEY = "footer";

    public darkModeEnabled = false;
    public loaded: boolean = false;

    public apiKey: string;
    public entry: string;

    constructor(
        private uiStyleToggleService: UiStyleToggleService,
        private builderIOService: BuilderIOService,
        private elementRef: ElementRef
    ) {}

    public ngOnInit(): void {
        this.uiStyleToggleService.DARK_MODE_ENABLED.pipe(takeUntil(this.destroy)).subscribe(
            (darkModeEnabled) => (this.darkModeEnabled = darkModeEnabled)
        );
    }

    public ngAfterViewInit(): void {
        this.loadContent();
    }

    public ngOnDestroy(): void {
        this.destroy.next();
        this.destroy.complete();
    }

    public toggleTheme(): void {
        this.uiStyleToggleService.toggle();
    }

    private loadContent(): void {
        this.loaded = false;
        this.builderIOService
            .getBuilderIOApiKey()
            .pipe(takeUntil(this.destroy))
            .subscribe((apiKey) => {
                const entry = this.builderIOService.getTemplateEntryByPageKey(this.BUILDER_IO_ENTRY_KEY);
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
            .pipe(takeUntil(this.destroy))
            .subscribe((js) => {
                this.apiKey = apiKey;
                this.entry = entry;
                this.injectJavascriptIntoTemplate(js);
                this.loaded = true;
            });
    }

    private injectJavascriptIntoTemplate(js: string): void {
        const script = document.createElement(this.JAVASCRIPT_ELEMENT_TYPE);
        script.type = this.JAVASCRIPT_SCRIPT_TYPE;
        script.innerHTML = js;
        this.elementRef.nativeElement.appendChild(script);
    }
}
