import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { EditPasswordDialogComponent } from "../edit-password-dialog/edit-password-dialog.component";
import { AuthenticationService } from "../../../services/authentication.service";
import { getRegistryURL } from "../../../helpers/RegistryAccessHelper";

import { APIKey, User, Catalog, CreateAPIKeyGQL, DeleteAPIKeyGQL, Scope } from "src/generated/graphql";
import { FormControl, FormGroup } from "@angular/forms";
import { MatTableDataSource } from "@angular/material/table";
import { Clipboard } from "@angular/cdk/clipboard";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { EditAccountDialogComponent } from "../edit-account-dialog/edit-account-dialog.component";
import { SnackBarService } from "src/app/services/snackBar.service";
import * as timeago from "timeago.js";
import { ApiKeyService } from "src/app/services/api-key.service";

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
    public State = State;
    public state = State.INIT;

    public deletionStatusByApiKeyId = new Map<string, boolean>();

    public currentUser: User;
    public apiKeysState = State.INIT;
    public createAPIKeyState = State.INIT;

    public newAPIKey: string;

    public columnsToDisplay = ["label", "created", "lastUsed", "actions"];

    public myCatalogs: Catalog[];
    public myAPIKeys: APIKey[];
    public dataSource = new MatTableDataSource<APIKey>();
    public createAPIKeyForm: FormGroup;

    private subscription = new Subject();

    constructor(
        public dialog: MatDialog,
        private authenticationService: AuthenticationService,
        private createAPIKeyGQL: CreateAPIKeyGQL,
        private apiKeysService: ApiKeyService,
        private deleteAPIKeyGQL: DeleteAPIKeyGQL,
        private clipboard: Clipboard,
        private snackBarService: SnackBarService
    ) {}

    public ngOnInit(): void {
        this.authenticationService.currentUser.pipe(takeUntil(this.subscription)).subscribe((user: User) => {
            this.currentUser = user;
            if (user) {
                this.state = State.SUCCESS;
            }
        });

        this.refreshAPIKeys(false, true);

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

    public createAPIKey(): void {
        if (this.createAPIKeyState === State.LOADING) {
            return;
        }

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
                this.refreshAPIKeys(true);
                this.createAPIKeyState = State.SUCCESS;
            });
    }

    public deleteApiKey(id: string): void {
        if (this.deletionStatusByApiKeyId.get(id)) {
            return;
        }

        this.deletionStatusByApiKeyId.set(id, true);
        this.createAPIKeyState = State.INIT;

        this.deleteAPIKeyGQL.mutate({ id: id }).subscribe((response) => {
            if (!response.errors || response.errors?.length === 0) {
                this.createAPIKeyForm.get("label").setValue("");
                this.refreshAPIKeys(true, false, id);
            }
        });
    }

    public refreshAPIKeys(forceReload?: boolean, enableLoadingState?: boolean, clearApiKeyId?: string): void {
        if (enableLoadingState) {
            this.apiKeysState = State.LOADING;
        }

        this.apiKeysService.getMyApiKeys(forceReload).subscribe(
            (apiKeys) => {
                if (apiKeys == null) {
                    return;
                }

                if (clearApiKeyId) {
                    this.deletionStatusByApiKeyId.delete(clearApiKeyId);
                }
                this.myAPIKeys = apiKeys;
                this.apiKeysState = State.SUCCESS;
            },
            () => (this.apiKeysState = State.ERROR)
        );
    }

    apiKeyCommandString() {
        const registryURL = getRegistryURL();

        return `datapm registry add ${registryURL} ${this.newAPIKey}`;
    }

    copyKeyToClipboard() {
        this.clipboard.copy(this.apiKeyCommandString());
        this.snackBarService.openSnackBar("Copied to clipboard! Paste the command into your terminal.", "");
    }
    getMoment(date: Date) {
        if (date == null) {
            return "Never";
        }

        return timeago.format(date, null, { minInterval: 60000 });
    }
}
