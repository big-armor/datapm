import { Component, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import {
    PlatformSettings,
    PlatformSettingsGQL,
    BuilderIOTemplate,
    BuilderIOSettings,
    SavePlatformSettingsGQL
} from "src/generated/graphql";

export interface BuilderIOTemplateWithFormControls extends BuilderIOTemplate {
    keyFormControl?: FormControl;
    entryFormControl?: FormControl;
}

enum State {
    LOADING,
    SAVING,
    LOADED,
    ERROR_DUPLICATE_KEYS,
    ERROR_INTERNAL
}

@Component({
    selector: "app-platform-settings",
    templateUrl: "./platform-settings.component.html",
    styleUrls: ["./platform-settings.component.scss"]
})
export class PlatformSettingsComponent implements OnInit {
    public static readonly BUILDER_IO_SETTINGS_KEY = "builder-io-settings";
    public static readonly NOT_FOUND_PAGE_ENTRY_KEY = "404";
    private static readonly REQUIRED_PLATFORM_KEYS = [PlatformSettingsComponent.NOT_FOUND_PAGE_ENTRY_KEY, "footer"];

    public state = State.LOADING;

    public builderIOApiKeyControl = new FormControl();
    public templates: BuilderIOTemplateWithFormControls[] = [];

    constructor(
        private platformSettingsGQL: PlatformSettingsGQL,
        private savePlatformSettingsGQL: SavePlatformSettingsGQL
    ) {}

    public ngOnInit(): void {
        this.loadPlatformSettings();
    }

    public get isLoading(): boolean {
        return State.LOADING === this.state;
    }

    public get hasValidationErrors(): boolean {
        return State.ERROR_DUPLICATE_KEYS === this.state;
    }

    public saveBuilderIOSettings(): void {
        this.validateKeysBeforeSaving();
        if (this.hasValidationErrors) {
            return;
        }

        this.addRequiredTemplatesBeforeSaving();
        const templatesToSerialize = this.templates.map((t) => {
            return {
                key: t.keyFormControl.value,
                entry: t.entryFormControl.value
            };
        });

        const settingsToSerialize = {
            apiKey: this.builderIOApiKeyControl.value,
            templates: templatesToSerialize
        } as BuilderIOSettings;

        const settings = {
            key: PlatformSettingsComponent.BUILDER_IO_SETTINGS_KEY,
            isPublic: true,
            serializedSettings: JSON.stringify(settingsToSerialize)
        } as PlatformSettings;

        this.savePlatformSettingsGQL
            .mutate({ settings })
            .subscribe((response) => this.setUpBuilderIOSettings(response.data.savePlatformSettings));
    }

    private addRequiredTemplatesBeforeSaving(): void {
        const missingTemplateKeys = PlatformSettingsComponent.REQUIRED_PLATFORM_KEYS.filter(
            (p) => !this.templates.some((t) => p === t.key)
        );
        missingTemplateKeys.map((k) => this.buildTemplateWithControl(k)).forEach((t) => this.templates.push(t));
    }

    public addNewEntry(): void {
        const newEntry = this.buildTemplateWithControl("", "");
        this.templates.push(newEntry);
    }

    public deleteEntry(index: number): void {
        this.templates.splice(index, 1);
    }

    private validateKeysBeforeSaving(): void {
        const usedKeys = [];
        const duplicateKeys = [];
        this.templates.forEach((t) => {
            if (usedKeys.includes(t.key)) {
                duplicateKeys.push(t.key);
            }

            usedKeys.push(t.key);
        });

        this.state = duplicateKeys.length ? State.ERROR_DUPLICATE_KEYS : State.SAVING;
    }

    private loadPlatformSettings(): void {
        this.state = State.LOADING;
        this.platformSettingsGQL.fetch().subscribe(
            (result) => {
                const builderIOPlatformSettings = result.data.platformSettings.find(
                    (p) => p.key === PlatformSettingsComponent.BUILDER_IO_SETTINGS_KEY
                );
                this.setUpBuilderIOSettings(builderIOPlatformSettings);
                this.state = State.LOADED;
            },
            () => (this.state = State.ERROR_INTERNAL)
        );
    }

    private setUpBuilderIOSettings(builderIOPlatformSettings: PlatformSettings): void {
        const deserializedSettings = JSON.parse(builderIOPlatformSettings.serializedSettings) as BuilderIOSettings;
        this.builderIOApiKeyControl = this.buildFormControlWithValue(deserializedSettings.apiKey);
        this.templates = deserializedSettings.templates.map((t) => this.buildTemplateWithControl(t.key, t.entry));
    }

    private buildTemplateWithControl(key?: string, entry?: string): BuilderIOTemplateWithFormControls {
        return {
            key,
            entry,
            keyFormControl: this.buildFormControlWithValue(key),
            entryFormControl: this.buildFormControlWithValue(entry)
        };
    }

    private buildFormControlWithValue(value?: string): FormControl {
        const control = new FormControl();
        control.setValue(value);
        return control;
    }
}
