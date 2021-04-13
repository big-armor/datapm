import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { map, tap } from "rxjs/operators";
import { HttpClient } from "@angular/common/http";

@Injectable({
    providedIn: "root"
})
export class ResourceImporterService {
    public readonly RESOURCE_BY_KEY = new Map<string, BehaviorSubject<string>>();

    private readonly METHOD_TYPE = "GET";
    private readonly PATH_PREFIX = "/static/";
    private readonly HTML_PATH_POSTFIX = ".html";
    private readonly JAVASCRIPT_PATH_POSTFIX = ".js";

    constructor(private httpClient: HttpClient) {}

    public getHtml(key: string): Observable<string> {
        return this.getResource(key, this.HTML_PATH_POSTFIX);
    }

    public getJavascript(key: string): Observable<string> {
        return this.getResource(key, this.JAVASCRIPT_PATH_POSTFIX);
    }

    private getResource(key: string, extension: string): Observable<string> {
        const identifier = key + extension;
        const cachedResource: BehaviorSubject<string> = this.RESOURCE_BY_KEY.get(identifier);
        if (cachedResource) {
            return cachedResource.asObservable();
        }

        const resourceSubject = new BehaviorSubject(null);
        this.RESOURCE_BY_KEY.set(identifier, resourceSubject);

        return this.httpClient
            .request(this.METHOD_TYPE, this.PATH_PREFIX + key + extension, { responseType: "text" })
            .pipe(
                map((resource) => resource.toString()),
                tap((html) => resourceSubject.next(html))
            );
    }
}
