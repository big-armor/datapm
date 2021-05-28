import { AfterContentChecked, AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from "@angular/core";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { BuilderIOService } from "src/app/imported/resource-importer.service";

@Component({
    selector: "sd-hero",
    templateUrl: "./hero.component.html",
    styleUrls: ["./hero.component.scss"]
})
export class HeroComponent implements OnInit, OnDestroy, AfterViewInit {
    private readonly destroy = new Subject<void>();

    public loaded: boolean = false;

    private readonly JAVASCRIPT_ELEMENT_TYPE = "script";
    private readonly JAVASCRIPT_SCRIPT_TYPE = "text/javascript";

    private readonly BUILDER_IO_ENTRY_KEY = "hero";

    public apiKey: string;
    public entry: string;

    constructor(private builderIOService: BuilderIOService, private elementRef: ElementRef) {}

    ngOnInit(): void {}

    public ngAfterViewInit(): void {
        this.loadContent();
    }

    public ngOnDestroy(): void {
        this.destroy.next();
        this.destroy.complete();
    }

    private loadContent(): void {
        this.loaded = false;
        this.builderIOService
            .getBuilderIOApiKey()
            .pipe(takeUntil(this.destroy))
            .subscribe((apiKey) => {
                const entry = this.builderIOService.getTemplateEntryByPageKey(this.BUILDER_IO_ENTRY_KEY);
                if (entry) {
                    console.log("wowz");
                    this.loadJavascriptAndInjectIntoTemplate(apiKey, entry);
                } else {
                    this.loaded = true;
                    console.log(" trueeee" + this.loaded);
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
