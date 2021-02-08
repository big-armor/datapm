import { ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from "@angular/core";
import { FormGroup, FormControl, Validators } from "@angular/forms";
import { MatChipInputEvent } from "@angular/material/chips";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { debounceTime, switchMap } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import {
    AutoCompleteResult,
    AutoCompleteUserGQL,
    Package,
    Permission,
    SetPackagePermissionsGQL,
    UserGQL
} from "src/generated/graphql";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { getEffectivePermissions } from "src/app/services/permissions.service";
import { emailAddressValid, usernameValid } from "datapm-lib";
import { Subscription } from "rxjs";

enum ErrorType {
    USER_NOT_FOUND = "USER_NOT_FOUND",
    CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS = "CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS",
    INVALID_EMAIL_ADDRESS = "INVALID_EMAIL_ADDRESS"
}

enum ChipState {
    SUCCESS,
    WARNING,
    ERROR
}

interface ChipData {
    state: ChipState;
    usernameOrEmailAddress?: string;
    stateMessage?: string;
}

@Component({
    selector: "app-add-user",
    templateUrl: "./add-user.component.html",
    styleUrls: ["./add-user.component.scss"]
})
export class AddUserComponent implements OnInit {
    public readonly ChipState = ChipState;
    public readonly CHIP_SEPARATOR_KEY_CODES: number[] = [ENTER, COMMA];

    private readonly EMAIL_DETECTION_CHARACTER = "@";

    private readonly USER_WITH_INVALID_EMAIL_LABEL = "This email address is invalid.";
    private readonly USER_WITH_INVALID_USERNAME_LABEL = "This username is invalid.";
    private readonly USER_WITH_EMAIL_NOT_FOUND_LABEL =
        "There are no registered users with this email but they will still be notified.";
    private readonly USER_WITH_USERNAME_NOT_FOUND_LABEL = "There are no registered users with this username.";

    public form: FormGroup;
    public state: PageState = "INIT";
    public error: ErrorType = null;

    public autoCompleteResult: AutoCompleteResult;
    public usernameControl: FormControl = new FormControl("", [Validators.required]);
    public messageControl: FormControl = new FormControl("");

    public usersChips: ChipData[] = [];
    public permission: Permission = Permission.VIEW;
    public packageName: string;

    public validatingUsername = false;
    public skipAutoCompleteSearch = false;

    @ViewChild("usernameInput")
    private fruitInput: ElementRef<HTMLInputElement>;

    private effectivePermissions: Permission[] = [];
    private autoCompleteSubscription: Subscription;

    constructor(
        private setPackagePermissions: SetPackagePermissionsGQL,
        private dialogRef: MatDialogRef<AddUserComponent>,
        private autocompleteUsers: AutoCompleteUserGQL,
        private userQuery: UserGQL,
        private changeDetectorRef: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public userPackage: Package
    ) {}

    public ngOnInit(): void {
        this.form = new FormGroup({
            username: this.usernameControl,
            message: this.messageControl
        });

        this.usernameControl.valueChanges
            .pipe(
                debounceTime(500),
                switchMap((value) => {
                    if (value == null || value.length < 2 || this.skipAutoCompleteSearch || this.validatingUsername) {
                        this.autoCompleteResult = null;
                        this.skipAutoCompleteSearch = false;
                        this.changeDetectorRef.detectChanges();
                        return [];
                    }
                    return this.autocompleteUsers.fetch({ startsWith: value });
                })
            )
            .subscribe((result) => {
                if (result.errors != null) {
                    this.autoCompleteResult = null;
                } else {
                    this.autoCompleteResult = result.data.autoComplete;
                }
            });
    }

    public submit(event: any): void {
        event.preventDefault();

        if (!this.form.valid) {
            return;
        }

        this.state = "LOADING";
        this.setPackagePermissions
            .mutate({
                identifier: {
                    catalogSlug: this.userPackage.identifier.catalogSlug,
                    packageSlug: this.userPackage.identifier.packageSlug
                },
                value: [
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: this.form.value.username
                    }
                ],
                message: ""
            })
            .subscribe(
                ({ errors, data }) => {
                    if (errors) {
                        this.state = "ERROR";

                        if (errors[0].message.includes("USER_NOT_FOUND")) this.error = ErrorType.USER_NOT_FOUND;
                        else if (errors[0].message.includes("CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS"))
                            this.error = ErrorType.CANNOT_SET_PACKAGE_CREATOR_PERMISSIONS;
                        else this.error = null;
                        return;
                    }
                    this.dialogRef.close("SUCCESS");
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }

    public updateSelectedPermission(permission: Permission): void {
        this.permission = permission;
        this.effectivePermissions = getEffectivePermissions(permission);
    }

    public selected(event: MatAutocompleteSelectedEvent): void {
        const optionValue: string = event.option.value;
        this.addUserChip(optionValue, ChipState.SUCCESS, null);
        this.fruitInput.nativeElement.value = "";
        this.usernameControl.setValue(null);
    }

    public removeFromSelection(chip: ChipData): void {
        const index = this.usersChips.indexOf(chip);

        if (index >= 0) {
            this.usersChips.splice(index, 1);
        }
    }

    public add(event: MatChipInputEvent): void {
        const input = event.input;
        const value = event.value;

        this.skipAutoCompleteSearch = true;
        const isEmail = value.includes(this.EMAIL_DETECTION_CHARACTER);
        if (isEmail) {
            this.validateEmailAndAddToTheList(value);
        } else {
            this.validateUsernameAndAddToTheList(value);
        }
        this.changeDetectorRef.detectChanges();
    }

    private validateEmailAndAddToTheList(value: string): void {
        const isValidEmail = emailAddressValid(value) === true;
        if (isValidEmail) {
            this.addUserChip(value, ChipState.WARNING, this.USER_WITH_EMAIL_NOT_FOUND_LABEL);
        } else {
            this.addUserChip(value, ChipState.ERROR, this.USER_WITH_INVALID_EMAIL_LABEL);
        }
    }

    private validateUsernameAndAddToTheList(value: string): void {
        if (this.isUserAlreadyAdded(value)) {
            return;
        }

        const isValidUsername = usernameValid(value) === true;
        if (!isValidUsername) {
            this.addUserChip(value, ChipState.ERROR, this.USER_WITH_INVALID_USERNAME_LABEL);
            return;
        }

        this.validatingUsername = true;
        this.userQuery.fetch({ username: value }).subscribe(
            (response) => {
                if (response.errors != null || !response.data.user) {
                    this.addUserChip(value, ChipState.ERROR, this.USER_WITH_USERNAME_NOT_FOUND_LABEL);
                } else {
                    if (!this.isUserAlreadyAdded(response.data.user.emailAddress)) {
                        this.addUserChip(value, ChipState.SUCCESS, null);
                    }
                }
            },
            () => this.addUserChip(value, ChipState.ERROR, this.USER_WITH_USERNAME_NOT_FOUND_LABEL),
            () => (this.validatingUsername = false)
        );
    }

    private addUserChip(value: string, state: ChipState, stateMessage: string): void {
        this.usersChips.push({
            usernameOrEmailAddress: value,
            state: state,
            stateMessage: stateMessage
        });

        this.usernameControl.setValue(null);
        this.fruitInput.nativeElement.value = "";
        setTimeout(() => this.fruitInput.nativeElement.focus(), 100);
    }

    private isUserAlreadyAdded(value: string): boolean {
        return this.usersChips.find((chip) => chip.usernameOrEmailAddress === value) != null;
    }
}
