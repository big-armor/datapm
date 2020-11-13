import { Injectable } from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";
import { HttpClient } from "@angular/common/http";
import { Subject } from "rxjs";
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

    constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

    refreshAvatar(username: string) {
        this.shouldRefresh.next({
            target: "avatar",
            username
        });
    }

    refreshCover() {
        this.shouldRefresh.next({
            target: "cover"
        });
    }

    getImage(url: string) {
        return this.http.get(url, { responseType: "blob" }).pipe(
            map((res: Blob) => {
                let objectURL = URL.createObjectURL(res);
                return this.sanitizer.bypassSecurityTrustUrl(objectURL);
            })
        );
    }
}
