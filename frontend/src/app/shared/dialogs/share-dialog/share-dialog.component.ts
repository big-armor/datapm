import { Clipboard } from "@angular/cdk/clipboard";
import { Component, Inject, OnInit } from "@angular/core";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { getRegistryURL } from "src/app/helpers/RegistryAccessHelper";
import { SnackBarService } from "src/app/services/snackBar.service";

@Component({
    selector: "app-share-dialog",
    templateUrl: "./share-dialog.component.html",
    styleUrls: ["./share-dialog.component.scss"]
})
export class ShareDialogComponent implements OnInit {
    constructor(
        @Inject(MAT_DIALOG_DATA) public info: {
            displayName: string,
            url: string
        },
        public clipboard: Clipboard,
        private snackBarService: SnackBarService
    ) {}

    ngOnInit(): void {}

    public redditLink() {
        let redditUrl = "http://www.reddit.com/submit?url=";
        return redditUrl + this.getUrl() + "&title=" + this.info.displayName;
    }

    public facebookLink() {
        let facebookUrl = "https://www.facebook.com/sharer/sharer.php?u=" + this.getUrl();
        return facebookUrl;
    }

    public twitterLink() {
        let twitterUrl = "https://twitter.com/intent/tweet?url=" + this.getUrl() + "&text=" + this.info.displayName;
        return twitterUrl;
    }

    public emailLink() {
        let emailUrl = "mailto:?subject=" + this.info.displayName + "&body=" + this.getUrl();
        return emailUrl;
    }

    public copyPackagelink() {
        this.clipboard.copy(this.getUrl());

        this.snackBarService.openSnackBar("Copied the package URL!", "");
    }

    getUrl() {
        return getRegistryURL() + "/" + this.info.url;
    }
}
