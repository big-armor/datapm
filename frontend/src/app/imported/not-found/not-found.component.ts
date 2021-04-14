import { Component, OnInit } from "@angular/core";
import { ResourceImporterService } from "../resource-importer.service";
import { combineLatest, Observable } from "rxjs";
import { tap } from "rxjs/operators";

@Component({
    selector: "app-not-found",
    templateUrl: "./not-found.component.html",
    styleUrls: ["./not-found.component.scss"]
})
export class NotFoundComponent implements OnInit {
    private readonly PAGE_STATIC_FILE_NAME = "404";
    private readonly PAGE_SCRIPT_STATIC_FILE_NAME = "header";

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
        return this.resourceImporterService.getJavascript(this.PAGE_SCRIPT_STATIC_FILE_NAME).pipe(
            tap((javascript) => {
                this.javascript = javascript;
                eval(this.javascript);
            })
        );
    }
}
