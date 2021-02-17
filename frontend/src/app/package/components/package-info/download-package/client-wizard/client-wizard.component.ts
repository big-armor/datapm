import { Component, OnInit, ViewChild } from "@angular/core";
import { MatStepper } from "@angular/material/stepper";
import { combineLatest } from "rxjs";
import { getRegistryURL } from "src/app/helpers/RegistryAccessHelper";
import { PackageService } from "src/app/package/services/package.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { ApiKeyService } from "src/app/services/api-key.service";

@Component({
    selector: "app-client-wizard",
    templateUrl: "./client-wizard.component.html",
    styleUrls: ["./client-wizard.component.scss"]
})
export class ClientWizardComponent implements OnInit {
    public currentIndex: number = 0;

    username: string;
    packageUrl: string;
    registryUrl: string;

    hasApiKeys = false;
    loading = false;

    constructor(
        public apiKeysService: ApiKeyService,
        public authenticationService: AuthenticationService,
        public pacakgeService: PackageService
    ) {}

    @ViewChild("stepper") private myStepper: MatStepper;

    ngOnInit() {
        this.registryUrl = getRegistryURL();

        this.loading = true;
        combineLatest([this.apiKeysService.getMyApiKeys(), this.pacakgeService.package]).subscribe(([apiKeys, pkg]) => {
            this.packageUrl = this.packageUrl =
                this.registryUrl + "/" + pkg.package.identifier.catalogSlug + "/" + pkg.package.identifier.packageSlug;

            let user = this.authenticationService.currentUser.value;
            if (user) {
                this.username = user.username;
            } else {
                this.username = "username";
            }

            this.hasApiKeys = apiKeys?.length > 0;
            this.loading = false;
            if (this.hasApiKeys) {
                setTimeout(() => this.move(3), 200);
            }
        });
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
}
