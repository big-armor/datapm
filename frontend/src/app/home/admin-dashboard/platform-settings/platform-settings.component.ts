import { Component, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import {
    PlatformSettings,
    PlatformSettingsGQL,
    BuilderIOTemplate,
    BuilderIOSettings,
    SavePlatformSettingsGQL
} from "src/generated/graphql";

export interface BuilderIOTemplateWithFormControl extends BuilderIOTemplate {
    entryFormControl?: FormControl;
}

@Component({
    selector: "app-platform-settings",
    templateUrl: "./platform-settings.component.html",
    styleUrls: ["./platform-settings.component.scss"]
})
export class PlatformSettingsComponent implements OnInit {
    public static readonly BUILDER_IO_SETTINGS_KEY = "builder-io-settings";
    private readonly BUILDER_IO_TEMPLATES = ["404", "contact", "footer", "header", "privacy"];

    public loading: boolean;

    public builderIOApiKeyControl = new FormControl();
    public templates: BuilderIOTemplateWithFormControl[] = [];

    constructor(
        private platformSettingsGQL: PlatformSettingsGQL,
        private savePlatformSettingsGQL: SavePlatformSettingsGQL
    ) {}

    public ngOnInit(): void {
        this.loadPlatformSettings();
    }

    public saveBuilderIOSettings(): void {
        const templatesToSerialize = this.templates.map((t) => {
            return {
                key: t.key,
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

    private loadPlatformSettings(): void {
        this.loading = true;
        this.platformSettingsGQL.fetch().subscribe(
            (result) => {
                const builderIOPlatformSettings = result.data.platformSettings.find(
                    (p) => p.key === PlatformSettingsComponent.BUILDER_IO_SETTINGS_KEY
                );
                this.setUpBuilderIOSettings(builderIOPlatformSettings);
                this.loading = false;
            },
            () => (this.loading = false)
        );
    }

    private setUpBuilderIOSettings(builderIOPlatformSettings: PlatformSettings): void {
        if (!builderIOPlatformSettings) {
            this.buildDefaultBuilderIOTemplates();
        } else {
            this.buildBuilderIOTemplates(builderIOPlatformSettings);
        }
    }

    private buildDefaultBuilderIOTemplates(): void {
        this.builderIOApiKeyControl = this.buildFormControlWithValue("");
        this.templates = this.BUILDER_IO_TEMPLATES.map((t) => {
            return {
                key: t,
                entry: "",
                entryFormControl: this.buildFormControlWithValue("")
            } as BuilderIOTemplateWithFormControl;
        });
    }

    private buildBuilderIOTemplates(builderIOPlatformSettings: PlatformSettings): void {
        const deserializedSettings = JSON.parse(builderIOPlatformSettings.serializedSettings) as BuilderIOSettings;
        this.builderIOApiKeyControl = this.buildFormControlWithValue(deserializedSettings.apiKey);
        this.templates = this.BUILDER_IO_TEMPLATES.map((t) => {
            const savedTemplate = deserializedSettings.templates.find((tp) => tp.key === t) || { key: t, entry: "" };
            return {
                key: t,
                entry: savedTemplate.entry,
                entryFormControl: this.buildFormControlWithValue(savedTemplate.entry)
            } as BuilderIOTemplateWithFormControl;
        });
    }

    private buildFormControlWithValue(value?: string): FormControl {
        const control = new FormControl();
        control.setValue(value);
        return control;
    }
}
