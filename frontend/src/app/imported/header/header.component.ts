import { Component, OnInit } from "@angular/core";
import { combineLatest, Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { ResourceImporterService } from "../resource-importer.service";

@Component({
    selector: "app-header",
    templateUrl: "./header.component.html",
    styleUrls: ["./header.component.scss"]
})
export class HeaderComponent implements OnInit {
    private readonly PAGE_STATIC_FILE_NAME = "header";

    public html: string;
    public javascript: string;
    public loading: boolean = false;

    constructor(private resourceImporterService: ResourceImporterService) {}

    public ngOnInit(): void {
        this.loadExternalContent();
    }

    private loadExternalContent(): void {
        this.loading = true;
        combineLatest([this.loadExternalHtml(), this.loadExternalJavascript()]).subscribe(
            ([html, js]) => (this.loading = false),
            () => (this.loading = false)
        );
    }

    private loadExternalHtml(): Observable<string> {
        return this.resourceImporterService.getHtml(this.PAGE_STATIC_FILE_NAME).pipe(tap((html) => (this.html = html)));
    }

    private loadExternalJavascript(): Observable<string> {
        return this.resourceImporterService.getJavascript(this.PAGE_STATIC_FILE_NAME).pipe(
            tap((javascript) => {
                this.javascript = javascript;
                eval(this.javascript);
            })
        );
    }
}
