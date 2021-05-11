import { Component, Input, OnChanges, SimpleChanges } from "@angular/core";

@Component({
    selector: "app-builder-io-renderer",
    templateUrl: "./builder-io-renderer.component.html",
    styleUrls: ["./builder-io-renderer.component.scss"]
})
export class BuilderIoRendererComponent implements OnChanges {
    private readonly ENTRY_TAG = "{{entry}}";
    private readonly API_KEY_TAG = "{{apiKey}}";
    private readonly BUILDER_UI_TEMPLATE = `<builder-component name="page" entry="${this.ENTRY_TAG}" api-key="${this.API_KEY_TAG}"></builder-component>`;

    @Input()
    public apiKey: string;

    @Input()
    public entry: string;

    public builderTemplate: string;

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.apiKey?.currentValue && changes.entry?.currentValue) {
            this.updateTemplate();
        }
    }

    private updateTemplate(): void {
        this.builderTemplate = this.BUILDER_UI_TEMPLATE.replace(this.API_KEY_TAG, this.apiKey).replace(
            this.ENTRY_TAG,
            this.entry
        );
    }
}
