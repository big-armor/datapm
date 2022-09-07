import { Component, OnInit, ViewChild } from "@angular/core";
import { MatStepper } from "@angular/material/stepper";
import { combineLatest } from "rxjs";
import { getRegistryURL } from "src/app/helpers/RegistryAccessHelper";
import { PackageService } from "src/app/package/services/package.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ApiKeyService } from "src/app/services/api-key.service";
import { SnackBarService } from "src/app/services/snackBar.service";
import { Clipboard } from "@angular/cdk/clipboard";
import { CurrentUser, Package, User } from "src/generated/graphql";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";

@Component({
    selector: "app-client-wizard",
    templateUrl: "./client-wizard.component.html",
    styleUrls: ["./client-wizard.component.scss"]
})
export class ClientWizardComponent implements OnInit {
    public currentIndex: number = 0;
    public currentUser: CurrentUser;

    username: string;
    package: Package;
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
        combineLatest([this.apiKeysService.getMyApiKeys(), this.pacakgeService.package]).subscribe(([apiKeys, pkg]) => {
            this.package = pkg.package;

            let currentUser = this.authenticationService.currentUser.value;
            if (currentUser) {
                this.username = currentUser.user.username;
                this.currentUser = currentUser;
            } else {
                this.username = "username";
            }
        });
    }

    public moveToDownloadStep() {
        if (this.currentUser) {
            this.move(2);
        } else {
            this.move(1);
        }
    }

    public isDownloadStepActive() {
        if (this.currentUser) {
            if (this.currentIndex == 2) {
                return true;
            } else {
                return false;
            }
        } else {
            if (this.currentIndex == 1) {
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
        this.copyToClipboard("datapm fetch " + this.getPackageIdentifier());
    }

    copyToClipboard(text) {
        this.clipboard.copy(text);
        this.snackBarService.openSnackBar("copied to clipboard!", "");
    }

    getPackageIdentifier() {
        return packageToIdentifier(this.package.identifier);
    }
}
