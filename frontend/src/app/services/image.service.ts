import { Injectable } from "@angular/core";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Subject } from "rxjs";

@Injectable({
    providedIn: "root"
})
export class ImageService {
    private imageDataSubjectByUrl = new Map<string, BehaviorSubject<SafeUrl>>();

    constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

    public loadUserAvatar(username: string, reload?: boolean): Subject<SafeUrl> {
        const url = this.buildUserAvatarUrl(username);
        return this.loadImage(url, reload);
    }

    public loadUserCover(username: string, reload?: boolean): Subject<SafeUrl> {
        const url = this.buildUserCoverUrl(username);
        return this.loadImage(url, reload);
    }

    public loadPackageCover(catalogSlug: string, packageSlug: string, reload?: boolean): Subject<SafeUrl> {
        const url = this.buildPackageCoverUrl(catalogSlug, packageSlug);
        return this.loadImage(url, reload);
    }

    public loadCatalogCover(catalogSlug: string, reload?: boolean): Subject<SafeUrl> {
        const url = this.buildCatalogCoverUrl(catalogSlug);
        return this.loadImage(url, reload);
    }

    public loadCollectionCover(catalogSlug: string, reload?: boolean): Subject<SafeUrl> {
        const url = this.buildCollectionCoverUrl(catalogSlug);
        return this.loadImage(url, reload);
    }

    public loadImage(url: string, reload?: boolean): Subject<SafeUrl> {
        const isImageCached = this.imageDataSubjectByUrl.has(url);
        if (!reload && isImageCached) {
            return this.imageDataSubjectByUrl.get(url);
        }

        let imageSubject;
        if (isImageCached) {
            imageSubject = this.imageDataSubjectByUrl.get(url);
        } else {
            imageSubject = new BehaviorSubject(null);
            this.imageDataSubjectByUrl.set(url, imageSubject);
        }

        this.http.get(url, { responseType: "blob" }).subscribe((res: Blob) => {
            const imageObjectURL = URL.createObjectURL(res);
            const safeImageObjectURL = this.sanitizer.bypassSecurityTrustUrl(imageObjectURL);
            imageSubject.next(safeImageObjectURL);
        });

        return imageSubject;
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
