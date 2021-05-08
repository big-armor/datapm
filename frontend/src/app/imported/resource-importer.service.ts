import { Injectable } from "@angular/core";
import { Observable, ReplaySubject } from "rxjs";
import { map, tap } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import { PlatformSettingsComponent } from "../home/admin-dashboard/platform-settings/platform-settings.component";
import { BuilderIOSettings, PublicPlatformSettingsByKeyGQL } from "src/generated/graphql";

@Injectable({
    providedIn: "root"
})
export class BuilderIOService {
    public readonly RESOURCE_BY_KEY = new Map<string, ReplaySubject<string>>();

    private readonly BUILDER_IO_SCRIPT_URL = "https://cdn.builder.io/js/webcomponents";
    private readonly GET_METHOD_TYPE = "GET";

    private builderIOApiKey = new ReplaySubject<string>(1);
    private templateEntryByKey = new Map<string, string>();

    constructor(private httpClient: HttpClient, private publicPlatformSettingsByKey: PublicPlatformSettingsByKeyGQL) {
        this.getBuilderIOSettingsObservable().subscribe();
    }

    public getBuilderIOScript(): Observable<string> {
        return this.getExternalResourceByUrl(this.BUILDER_IO_SCRIPT_URL);
    }

    public getBuilderIOApiKey(): Observable<string> {
        return this.builderIOApiKey;
    }

    public getTemplateEntryByPageKey(pageKey: string): string {
        return this.templateEntryByKey.get(pageKey);
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
