import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { CurrentUser, UpdateMeGQL, User } from "src/generated/graphql";
import { AuthenticationService } from "./authentication.service";

export enum ThemeMode {
    DARK,
    LIGHT
}

@Injectable({
    providedIn: "root"
})
export class UiStyleToggleService {
    public readonly DARK_MODE_ENABLED = new BehaviorSubject<boolean>(false);
    private readonly THEME_KEY = "THEME";
    private readonly DARK_THEME_VALUE = "DARK";
    private readonly LIGHT_THEME_VALUE = "LIGHT";
    private readonly DARK_THEME_CLASS_NAME = "theme-dark";
    private readonly DARK_MODE_OS_SETTINGS_CSS = "(prefers-color-scheme: dark)";

    private currentUser: CurrentUser;
    private darkThemeSelected = false;

    constructor(private updateMeGQL: UpdateMeGQL, private authenticationService: AuthenticationService) {
        this.loadThemeFromLocalStorage();
        this.authenticationService.currentUser.subscribe((currentUser) => {
            if (currentUser) {
                this.currentUser = currentUser;
                this.darkThemeSelected = currentUser.user.uiDarkModeEnabled;
                this.setThemeOnStart();
                this.storeThemeInLocalStorage();
            }
        });
    }

    public setThemeOnStart() {
        if (this.darkThemeSelected) {
            this.setDarkTheme();
        } else {
            this.setLightTheme();
        }

        setTimeout(() => document.body.classList.add("animate-colors-transition"), 500);
    }

    public toggle() {
        if (this.darkThemeSelected) {
            this.setLightTheme();
        } else {
            this.setDarkTheme();
        }

        this.updateSelectedStylePreferences();
    }

    private loadThemeFromLocalStorage(): void {
        const themeValue = localStorage.getItem(this.THEME_KEY);
        if (!themeValue) {
            this.darkThemeSelected = window.matchMedia(this.DARK_MODE_OS_SETTINGS_CSS).matches;
        } else {
            this.darkThemeSelected = themeValue === this.DARK_THEME_VALUE;
        }

        if (this.darkThemeSelected) {
            this.setDarkTheme();
        }
    }

    private storeThemeInLocalStorage(): void {
        const themeValue = this.darkThemeSelected ? this.DARK_THEME_VALUE : this.LIGHT_THEME_VALUE;
        localStorage.setItem(this.THEME_KEY, themeValue);
    }

    private setLightTheme() {
        document.body.classList.remove(this.DARK_THEME_CLASS_NAME);
        this.darkThemeSelected = false;
        this.DARK_MODE_ENABLED.next(false);
    }

    private setDarkTheme() {
        document.body.classList.add(this.DARK_THEME_CLASS_NAME);
        this.darkThemeSelected = true;
        this.DARK_MODE_ENABLED.next(true);
    }

    private updateSelectedStylePreferences(): void {
        this.storeThemeInLocalStorage();
        if (!this.currentUser) {
            return;
        }

        this.updateMeGQL
            .mutate({
                value: {
                    uiDarkModeEnabled: this.darkThemeSelected
                }
            })
            .subscribe((response) => {
                const updatedUser = response.data.updateMe;
                if (!response.errors && updatedUser) {
                    this.authenticationService.currentUser.next(updatedUser);
                }
            });
    }
}
