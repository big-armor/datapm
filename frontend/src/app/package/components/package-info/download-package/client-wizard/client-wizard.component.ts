import { Component, OnInit, ViewChild } from "@angular/core";
import { MatStepper } from "@angular/material/stepper";
import { combineLatest } from "rxjs";
import { getRegistryURL } from "src/app/helpers/RegistryAccessHelper";
import { PackageService } from "src/app/package/services/package.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ApiKeyService } from "src/app/services/api-key.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { Clipboard } from "@angular/cdk/clipboard";
import { User } from "src/generated/graphql";

@Component({
    selector: "app-client-wizard",
    templateUrl: "./client-wizard.component.html",
    styleUrls: ["./client-wizard.component.scss"]
})
export class ClientWizardComponent implements OnInit {
    public currentIndex: number = 0;
    public currentUser: User;

    username: string;
    packageUrl: string;
    registryUrl: string;

    hasApiKeys = false;
    loading = false;

    constructor(
        public apiKeysService: ApiKeyService,
        public authenticationService: AuthenticationService,
        public pacakgeService: PackageService,
        private snackBarService: SnackBarService,
        private clipboard: Clipboard
    ) {}

    @ViewChild("stepper") private myStepper: MatStepper;

    ngOnInit() {
        this.registryUrl = getRegistryURL();

        this.loading = true;
        console.log("wow");
        combineLatest([this.apiKeysService.getMyApiKeys(), this.pacakgeService.package]).subscribe(([apiKeys, pkg]) => {
            console.log("keys", apiKeys);
            console.log("pkg", pkg);

            this.packageUrl = this.packageUrl =
                this.registryUrl + "/" + pkg.package.identifier.catalogSlug + "/" + pkg.package.identifier.packageSlug;

            let user = this.authenticationService.currentUser.value;
            if (user) {
                this.username = user.username;
                this.currentUser = user;
            } else {
                this.username = "username";
            }

            this.loading = false;
            this.hasApiKeys = apiKeys != null && apiKeys.length > 0;
            if (this.hasApiKeys) {
                setTimeout(() => this.move(3), 200);
            }
        });
    }

    public moveToDownloadStep() {
        if (this.currentUser) {
            this.move(3);
        } else {
            this.move(2);
        }
    }

    public isDownloadStepActive() {
        if (this.currentUser) {
            if (this.currentIndex == 3) {
                return true;
            } else {
                return false;
            }
        } else {
            if (this.currentIndex == 2) {
                return true;
            } else {
                return false;
            }
        }
    }

    public move(index: number) {
        this.currentIndex = index;
        this.myStepper.selectedIndex = index;
    }

    public next() {
        this.move(this.currentIndex + 1);
    }

    public previous() {
        this.move(this.currentIndex - 1);
    }

    copyNodeVersionCmd() {
        this.copyToClipboard("node -v");
    }

    copyNpmVersionCmd() {
        this.copyToClipboard("npm -v");
    }

    copyNpmInstall() {
        this.copyToClipboard("npm install -g datapm-client");
    }

    copyDataVersion() {
        this.copyToClipboard("datapm --version");
    }

    copyRegistryLogin() {
        this.copyToClipboard("datapm registry login" + this.registryUrl + " " + this.username);
    }

    copyDataFetch() {
        this.copyToClipboard("datapm fetch " + this.packageUrl);
    }

    copyToClipboard(text) {
        this.clipboard.copy(text);
        this.snackBarService.openSnackBar("copied to clipboard!", "");
    }
}
