import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
    ViewEncapsulation
} from "@angular/core";
import { MatAutocompleteSelectedEvent } from "@angular/material/autocomplete";
import { MatChipInputEvent } from "@angular/material/chips";
import { COMMA, ENTER } from "@angular/cdk/keycodes";
import { AutoCompleteResult, AutoCompleteUserGQL, UserGQL } from "src/generated/graphql";
import { FormControl } from "@angular/forms";
import { debounceTime, switchMap } from "rxjs/operators";
import { emailAddressValid, usernameValid } from "datapm-lib";
import { ChipState } from "./chip-state";
import { ChipData } from "./chip-data";

@Component({
    selector: "app-user-invite-input",
    templateUrl: "./user-invite-input.component.html",
    styleUrls: ["./user-invite-input.component.scss"]
})
export class UserInviteInputComponent implements OnInit {
    public readonly ChipState = ChipState;
    public readonly CHIP_SEPARATOR_KEY_CODES: number[] = [ENTER, COMMA];

    private readonly EMAIL_DETECTION_CHARACTER = "@";

    private readonly USER_WITH_INVALID_EMAIL_LABEL = "This email address is invalid.";
    private readonly USER_WITH_INVALID_USERNAME_LABEL = "This username is invalid.";
    private readonly USER_WITH_EMAIL_NOT_FOUND_LABEL =
        "There are no registered users with this email but they will still be notified.";
    private readonly USER_WITH_USERNAME_NOT_FOUND_LABEL = "There are no registered users with this username.";

    @Input()
    public usernameControl: FormControl;

    @Output()
    public userInputChange = new EventEmitter<ChipData[]>();

    @Output()
    public loadingStateChange = new EventEmitter<boolean>();

    public usersChips: ChipData[] = [];

    public validatingUsername = false;
    public skipAutoCompleteSearch = false;
    encapsulation: ViewEncapsulation.None;

    @ViewChild("usernameInput")
    private fruitInput: ElementRef<HTMLInputElement>;

    public autoCompleteResult: AutoCompleteResult;

    public constructor(
        private userQuery: UserGQL,
        private autocompleteUsers: AutoCompleteUserGQL,
        private changeDetectorRef: ChangeDetectorRef
    ) {}

    public ngOnInit(): void {
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

    public selectFromAutocompleteDropdown(event: MatAutocompleteSelectedEvent): void {
        const optionValue: string = event.option.value;
        this.addUserChip(optionValue, ChipState.SUCCESS, null);
        this.fruitInput.nativeElement.value = "";
        this.usernameControl.setValue(null);
    }

    public add(event: MatChipInputEvent): void {
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

    public removeFromSelection(chip: ChipData): void {
        const index = this.usersChips.indexOf(chip);

        if (index >= 0) {
            this.usersChips.splice(index, 1);
            this.emitUserInputChangeEvent();
        }
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
        this.emitUserInputChangeEvent();
    }

    private emitUserInputChangeEvent(): void {
        this.userInputChange.emit(this.usersChips);
    }

    private isUserAlreadyAdded(value: string): boolean {
        return this.usersChips.find((chip) => chip.usernameOrEmailAddress === value) != null;
    }
}
