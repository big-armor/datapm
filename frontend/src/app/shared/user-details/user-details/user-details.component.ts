import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog, MatDialogConfig } from "@angular/material/dialog";
import { EditPasswordDialogComponent } from "../edit-password-dialog/edit-password-dialog.component";
import { AuthenticationService } from "../../../services/authentication.service";
import { getRegistryURL } from "../../../helpers/RegistryAccessHelper";

import {
    APIKey,
    User,
    Catalog,
    CreateAPIKeyGQL,
    DeleteAPIKeyGQL,
    Scope,
    UpdateCatalogGQL,
    Permission,
    GetCatalogGQL,
    CurrentUser
} from "src/generated/graphql";
import { FormControl, FormGroup } from "@angular/forms";
import { MatTableDataSource } from "@angular/material/table";
import { Clipboard } from "@angular/cdk/clipboard";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { EditAccountDialogComponent } from "../edit-account-dialog/edit-account-dialog.component";
import { SnackBarService } from "src/app/services/snackBar.service";
import * as timeago from "timeago.js";
import { ApiKeyService } from "src/app/services/api-key.service";
import { UiStyleToggleService } from "src/app/services/ui-style-toggle.service";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { DialogService } from "src/app/services/dialog/dialog.service";

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

    public Permission = Permission;

    public deletionStatusByApiKeyId = new Map<string, boolean>();

    public currentUser: CurrentUser;
    public apiKeysState = State.INIT;
    public createAPIKeyState = State.INIT;

    public newAPIKey: string;

    public columnsToDisplay = ["label", "created", "lastUsed", "actions"];

    public myAPIKeys: APIKey[];
    public dataSource = new MatTableDataSource<APIKey>();
    public createAPIKeyForm: FormGroup;

    public catalogState = State.INIT;
    public catalog: Catalog;
    public isCatalogPublic: boolean = false;
    public publicAccessSavingError: boolean = false;

    private subscription = new Subject();

    constructor(
        private dialog: MatDialog,
        private dialogService: DialogService,
        private authenticationService: AuthenticationService,
        private createAPIKeyGQL: CreateAPIKeyGQL,
        private getCatalogGQL: GetCatalogGQL,
        private updateCatalogGQL: UpdateCatalogGQL,
        private apiKeysService: ApiKeyService,
        private deleteAPIKeyGQL: DeleteAPIKeyGQL,
        private clipboard: Clipboard,
        private snackBarService: SnackBarService,
        private uiStyleToggleService: UiStyleToggleService
    ) {}

    public ngOnInit(): void {
        this.authenticationService.currentUser
            .pipe(takeUntil(this.subscription))
            .subscribe((currentUser: CurrentUser) => {
                this.currentUser = currentUser;
                if (currentUser) {
                    this.state = State.SUCCESS;
                }

                this.getCatalogGQL
                    .fetch({
                        identifier: {
                            catalogSlug: currentUser.user.username
                        }
                    })
                    .subscribe(({ data, errors }) => {
                        if (errors && errors.length > 0) {
                            this.catalogState = State.ERROR;
                            return;
                        }

                        this.setCatalogVariables(data.catalog);
                    });
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
        this.subscription.next();
        this.subscription.unsubscribe();
    }

    public toggleDarkMode(): void {
        this.uiStyleToggleService.toggle();
    }

    openPasswordDialog() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = this.currentUser;

        this.dialog.open(EditPasswordDialogComponent, dialogConfig);
    }

    public updatePublic(ev: MatSlideToggleChange): void {
        this.isCatalogPublic = ev.checked;
        this.openPackageVisibilityChangeDialog(ev.checked);
    }

    private openPackageVisibilityChangeDialog(isPublic: boolean): void {
        this.dialogService.openCatalogVisibilityChangeConfirmationDialog(isPublic).subscribe((confirmed) => {
            if (confirmed) {
                this.updateCatalogVisibility(isPublic);
            } else {
                this.isCatalogPublic = !isPublic;
            }
        });
    }

    private updateCatalogVisibility(isPublic: boolean): void {
        this.publicAccessSavingError = false;
        this.updateCatalogGQL
            .mutate({
                identifier: {
                    catalogSlug: this.currentUser.user.username
                },
                value: {
                    isPublic
                }
            })
            .subscribe(
                ({ data, errors }) => {
                    if (errors) {
                        this.publicAccessSavingError = true;
                    } else {
                        this.setCatalogVariables(data.updateCatalog as Catalog);
                    }
                },
                (errors) => {
                    this.publicAccessSavingError = true;
                }
            );
    }

    openEditDialog() {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.data = this.currentUser;

        this.dialog
            .open(EditAccountDialogComponent, dialogConfig)
            .afterClosed()
            .subscribe(() => this.authenticationService.refreshUserInfo());
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

    private setCatalogVariables(catalog: Catalog): void {
        this.catalog = catalog;
        this.isCatalogPublic = catalog.isPublic;
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
