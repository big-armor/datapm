import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { EditPasswordDialogComponent } from "../edit-password-dialog/edit-password-dialog.component";
import { AuthenticationService } from "../../../services/authentication.service";
import { getRegistryURL } from "../../../helpers/RegistryAccessHelper";

import { APIKey, User, Catalog, CreateAPIKeyGQL, MyAPIKeysGQL, DeleteAPIKeyGQL, Scope } from "src/generated/graphql";
import { FormControl, FormGroup } from "@angular/forms";
import { MatTableDataSource } from "@angular/material/table";
import { Clipboard } from "@angular/cdk/clipboard";
import { Subject } from "rxjs";
import { take, takeUntil } from "rxjs/operators";
import { EditAccountDialogComponent } from "../edit-account-dialog/edit-account-dialog.component";
import { SnackBarService } from "src/app/services/snackBar.service";

enum State {
    INIT,
    LOADING,
    ERROR,
    SUCCESS,
    ERROR_NOT_UNIQUE,
    ERROR_NO_LABEL
}

@Component({
    selector: "app-user-details",
    templateUrl: "./user-details.component.html",
    styleUrls: ["./user-details.component.scss"]
})
export class UserDetailsComponent implements OnInit, OnDestroy {
    State = State;
    state = State.INIT;

    currentUser: User;
    public apiKeysState = State.INIT;
    createAPIKeyState = State.INIT;
    deleteAPIKeyState = State.INIT;
    newAPIKey: string;

    columnsToDisplay = ["label", "actions"];

    public myCatalogs: Catalog[];
    public myAPIKeys: APIKey[];
    dataSource = new MatTableDataSource<APIKey>();
    createAPIKeyForm: FormGroup;

    private subscription = new Subject();

    constructor(
        public dialog: MatDialog,
        private authenticationService: AuthenticationService,
        private createAPIKeyGQL: CreateAPIKeyGQL,
        private myAPIKeysGQL: MyAPIKeysGQL,
        private deleteAPIKeyGQL: DeleteAPIKeyGQL,
        private clipboard: Clipboard,
        private snackBarService: SnackBarService
    ) {}

    ngOnInit(): void {
        this.authenticationService.currentUser.pipe(takeUntil(this.subscription)).subscribe((user: User) => {
            this.currentUser = user;
            if (user) {
                this.state = State.SUCCESS;
            }
        });

        this.refreshAPIKeys();

        this.createAPIKeyForm = new FormGroup({
            label: new FormControl("")
        });

        this.dialog.afterAllClosed.subscribe((result) => {
            this.authenticationService.refreshUserInfo();
        });
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    openPasswordDialog() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = this.currentUser;

        this.dialog.open(EditPasswordDialogComponent, dialogConfig);
    }

    openEditDialog() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = this.currentUser;

        this.dialog.open(EditAccountDialogComponent, dialogConfig);

        this.dialog.afterAllClosed.subscribe((result) => {
            this.authenticationService.refreshUserInfo();
        });
    }

    createAPIKey() {
        if (this.createAPIKeyForm.value.label == "" || this.createAPIKeyForm.value.label == null) {
            this.createAPIKeyState = State.ERROR_NO_LABEL;
            return;
        }
        this.createAPIKeyState = State.LOADING;

        this.createAPIKeyGQL
            .mutate({
                value: {
                    label: this.createAPIKeyForm.value.label,
                    scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
                }
            })
            .pipe(takeUntil(this.subscription))
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    if (response.errors.find((e) => e.message == "APIKEY_LABEL_NOT_AVIALABLE")) {
                        this.createAPIKeyState = State.ERROR_NOT_UNIQUE;
                        return;
                    }

                    this.createAPIKeyState = State.ERROR;
                    return;
                }

                const key = response.data.createAPIKey;

                this.newAPIKey = btoa(key.id + "." + key.secret);

                this.createAPIKeyForm.get("label").setValue("");
                this.refreshAPIKeys();
                this.createAPIKeyState = State.SUCCESS;
            });
    }

    deleteApiKey(id: string) {
        this.deleteAPIKeyState = State.LOADING;
        this.apiKeysState = State.LOADING;

        this.myAPIKeys = this.myAPIKeys.filter((k) => k.id != id);

        const deletedKey = this.myAPIKeys.find((k) => k.id == id);

        const startingArray = this.myAPIKeys;

        this.deleteAPIKeyGQL
            .mutate({ id: id })
            .pipe(takeUntil(this.subscription))
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    this.deleteAPIKeyState = State.ERROR;

                    if (startingArray == this.myAPIKeys) this.myAPIKeys.push(deletedKey);
                    return;
                }

                this.createAPIKeyForm.get("label").setValue("");
                this.refreshAPIKeys();
                this.deleteAPIKeyState = State.SUCCESS;
            });
    }

    refreshAPIKeys() {
        this.apiKeysState = State.LOADING;

        this.myAPIKeysGQL
            .fetch({}, { fetchPolicy: "no-cache" })
            .pipe(takeUntil(this.subscription))
            .subscribe((response) => {
                if (response.errors?.length > 0) {
                    this.apiKeysState = State.ERROR;
                    return;
                }
                this.myAPIKeys = response.data.myAPIKeys;
                this.apiKeysState = State.SUCCESS;
            });
    }

    apiKeyCommandString() {
        const registryURL = getRegistryURL();

        return `datapm registry add ${registryURL} ${this.newAPIKey}`;
    }

    copyKeyToClipboard() {
        this.clipboard.copy(this.apiKeyCommandString());
        this.snackBarService.openSnackBar("Copied to clipboard! Paste the command into your terminal.", "");
    }
}
