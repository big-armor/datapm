import { Injectable } from "@angular/core";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { HttpClient } from "@angular/common/http";
import { Observable, of, Subject } from "rxjs";
import { map } from "rxjs/operators";

export interface ImageRefreshTarget {
    target: string;
    [key: string]: string;
}

@Injectable({
    providedIn: "root"
})
export class ImageService {
    public shouldRefresh = new Subject<ImageRefreshTarget>();
    private imageDataByUrl = new Map<string, Observable<SafeUrl>>();

    constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

    public refreshAvatar(username: string): void {
        this.shouldRefresh.next({
            target: "avatar",
            username
        });
    }

    public refreshCover(): void {
        this.shouldRefresh.next({
            target: "cover"
        });
    }

    public getUserAvatar(username: string, reload?: boolean): Observable<SafeUrl> {
        const url = this.buildUserAvatarUrl(username);
        return this.getImage(url, reload);
    }

    public getUserCover(username: string, reload?: boolean): Observable<SafeUrl> {
        const url = this.buildUserCoverUrl(username);
        return this.getImage(url, reload);
    }

    public getPackageCover(catalogSlug: string, packageSlug: string, reload?: boolean): Observable<SafeUrl> {
        const url = this.buildPackageCoverUrl(catalogSlug, packageSlug);
        return this.getImage(url, reload);
    }

    public getCatalogCover(catalogSlug: string, reload?: boolean): Observable<SafeUrl> {
        const url = this.buildCatalogCoverUrl(catalogSlug);
        return this.getImage(url, reload);
    }

    public getCollectionCover(catalogSlug: string, reload?: boolean): Observable<SafeUrl> {
        const url = this.buildCollectionCoverUrl(catalogSlug);
        return this.getImage(url, reload);
    }

    public getImage(url: string, reload?: boolean): Observable<SafeUrl> {
        if (!reload && this.imageDataByUrl.has(url)) {
            return this.imageDataByUrl.get(url);
        }

        return this.http.get(url, { responseType: "blob" }).pipe(
            map((res: Blob) => {
                const imageObjectURL = URL.createObjectURL(res);
                const safeImageObjectURL = this.sanitizer.bypassSecurityTrustUrl(imageObjectURL);
                this.imageDataByUrl.set(url, of(safeImageObjectURL));
                return safeImageObjectURL;
            })
        );
    }

    private buildUserAvatarUrl(username: string): string {
        return `/images/user/${username}/avatar`;
    }

    private buildUserCoverUrl(username: string): string {
        return `/images/user/${username}/cover`;
    }

    private buildPackageCoverUrl(catalogSlug: string, packageSlug: string): string {
        return `/images/package/${catalogSlug}/${packageSlug}/cover`;
    }

    private buildCatalogCoverUrl(catalogSlug: string): string {
        return `/images/catalog/${catalogSlug}/cover`;
    }

    private buildCollectionCoverUrl(collectionSlug: string): string {
        return `/images/collection/${collectionSlug}/cover`;
    }
}
