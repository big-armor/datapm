import { ElementRef, Injectable } from "@angular/core";
import { Observable, ReplaySubject } from "rxjs";
import { map, take, tap } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { PlatformSettingsComponent } from "../home/admin-dashboard/platform-settings/platform-settings.component";
import { BuilderIOSettings, PublicPlatformSettingsByKeyGQL } from "src/generated/graphql";

@Injectable({
    providedIn: "root"
})
export class ResourceImporterService {
    public readonly RESOURCE_BY_KEY = new Map<string, ReplaySubject<string>>();

    private readonly BUILDER_IO_SCRIPT_URL = "https://cdn.builder.io/js/webcomponents";
    private readonly JAVASCRIPT_ELEMENT_TYPE = "script";
    private readonly JAVASCRIPT_SCRIPT_TYPE = "text/javascript";

    private readonly GET_METHOD_TYPE = "GET";
    private readonly PATH_PREFIX = "/static/";
    private readonly HTML_PATH_POSTFIX = ".html";
    private readonly JAVASCRIPT_PATH_POSTFIX = ".js";
    private readonly API_KEY_REGEX = "{{apiKey}}";
    private readonly ENTRY_KEY_REGEX = "{{entry}}";

    private builderIOApiKey = new ReplaySubject<string>(1);
    private templateEntryByKey = new Map<string, string>();

    constructor(private httpClient: HttpClient, private publicPlatformSettingsByKey: PublicPlatformSettingsByKeyGQL) {
        this.getBuilderIOSettingsObservable().subscribe();
    }

    public appendBuilderIOScriptToElementRef(elementRef: ElementRef): void {
        this.getBuilderIOScript().subscribe((js) => {
            var script = document.createElement(this.JAVASCRIPT_ELEMENT_TYPE);
            script.type = this.JAVASCRIPT_SCRIPT_TYPE;
            script.innerHTML = js;
            elementRef.nativeElement.appendChild(script);
        });
    }

    public getHtml(key: string): Observable<string> {
        return this.getResource(key, this.HTML_PATH_POSTFIX, true);
    }

    public getJavascript(key: string): Observable<string> {
        return this.getResource(key, this.JAVASCRIPT_PATH_POSTFIX);
    }

    public getBuilderIOScript(): Observable<string> {
        return this.getExternalResourceByUrl(this.BUILDER_IO_SCRIPT_URL);
    }

    private getBuilderIOSettingsObservable(): Observable<any> {
        return this.publicPlatformSettingsByKey.fetch({ key: PlatformSettingsComponent.BUILDER_IO_SETTINGS_KEY }).pipe(
            tap((result) => {
                const resultData = result.data;
                if (!resultData) {
                    return;
                }

                const settings = JSON.parse(
                    resultData.publicPlatformSettingsByKey.serializedSettings
                ) as BuilderIOSettings;
                settings.templates.forEach((t) => this.templateEntryByKey.set(t.key, t.entry));
                this.builderIOApiKey.next(settings.apiKey);
            })
        );
    }

    private getResource(key: string, extension: string, replaceVariables?: boolean): Observable<string> {
        const identifier = key + extension;
        const cachedResource: ReplaySubject<string> = this.RESOURCE_BY_KEY.get(identifier);
        if (cachedResource) {
            return cachedResource.asObservable();
        }

        const resourceSubject = new ReplaySubject<string>(1);
        this.RESOURCE_BY_KEY.set(identifier, resourceSubject);

        this.httpClient
            .request(this.GET_METHOD_TYPE, this.PATH_PREFIX + key + extension, { responseType: "text" })
            .pipe(
                map((resource) => resource.toString()),
                tap((content) => {
                    if (!replaceVariables) {
                        resourceSubject.next(content);
                        return;
                    }

                    this.builderIOApiKey.pipe(take(1)).subscribe((apiKey) => {
                        const replacedContent = content
                            .replace(this.API_KEY_REGEX, apiKey)
                            .replace(this.ENTRY_KEY_REGEX, this.templateEntryByKey.get(key));
                        resourceSubject.next(replacedContent);
                    });
                })
            )
            .subscribe();
        return resourceSubject;
    }

    private getExternalResourceByUrl(url: string): Observable<string> {
        const cachedResource: ReplaySubject<string> = this.RESOURCE_BY_KEY.get(url);
        if (cachedResource) {
            return cachedResource.asObservable();
        }

        const resourceSubject = new ReplaySubject<string>(1);
        this.RESOURCE_BY_KEY.set(url, resourceSubject);

        this.httpClient
            .request(this.GET_METHOD_TYPE, url, { responseType: "text" })
            .pipe(
                map((resource) => resource.toString()),
                tap((content) => resourceSubject.next(content))
            )
            .subscribe();
        return resourceSubject;
    }
}
