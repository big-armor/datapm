import { Component, OnInit, ViewChild } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { MatStepper } from "@angular/material/stepper";
import { combineLatest } from "rxjs";
import { getRegistryURL } from "src/app/helpers/RegistryAccessHelper";
import { PackageService } from "src/app/package/services/package.service";
import { AuthenticationService } from "src/app/services/authentication.service";
import { MyAPIKeysGQL } from "src/generated/graphql";

@Component({
    selector: "app-client-wizard",
    templateUrl: "./client-wizard.component.html",
    styleUrls: ["./client-wizard.component.scss"]
})
export class ClientWizardComponent implements OnInit {
    firstFormGroup: FormGroup;
    secondFormGroup: FormGroup;
    thirdFormGroup: FormGroup;
    fourthFormGroup: FormGroup;

    public currentIndex: number = 0;

    username: string;
    packageUrl: string;
    registryUrl: string;

    hasApiKeys = false;
    loading = false;

    constructor(
        private _formBuilder: FormBuilder,
        public myAPIKeysGQL: MyAPIKeysGQL,
        public authenticationService: AuthenticationService,
        public pacakgeService: PackageService
    ) {}

    @ViewChild("stepper") private myStepper: MatStepper;

    ngOnInit() {
        this.firstFormGroup = this._formBuilder.group({
            firstCtrl: ["", Validators.required]
        });
        this.secondFormGroup = this._formBuilder.group({
            secondCtrl: ["", Validators.required]
        });
        this.thirdFormGroup = this._formBuilder.group({
            firstCtrl: ["", Validators.required]
        });
        this.fourthFormGroup = this._formBuilder.group({
            secondCtrl: ["", Validators.required]
        });

        this.registryUrl = getRegistryURL();

        this.loading = true;
        combineLatest([
            this.myAPIKeysGQL.fetch({}, { fetchPolicy: "no-cache" }),
            this.pacakgeService.package
        ]).subscribe(([keysResponse, pkg]) => {
            this.packageUrl = this.packageUrl =
                this.registryUrl + "/" + pkg.package.identifier.catalogSlug + "/" + pkg.package.identifier.packageSlug;

            let user = this.authenticationService.currentUser.value;
            if (user) {
                this.username = user.username;
            } else {
                this.username = "username";
            }

            this.hasApiKeys = keysResponse.data?.myAPIKeys?.length > 0;
            if (this.hasApiKeys) {
                this.move(3);
            }
            this.loading = false;
        });
    }

    move(index: number) {
        this.myStepper.selectedIndex = index;
        this.currentIndex = index;
    }

    public next() {
        this.move(this.currentIndex + 1);
    }

    public previous() {
        this.move(this.currentIndex - 1);
    }
}
