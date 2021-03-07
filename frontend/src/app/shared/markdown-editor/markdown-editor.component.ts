import { Component, EventEmitter, Input, Output } from "@angular/core";

@Component({
    selector: "app-markdown-editor",
    templateUrl: "./markdown-editor.component.html",
    styleUrls: ["./markdown-editor.component.scss"]
})
export class MarkdownEditorComponent {
    public readonly EDITOR_OPTIONS = {
        showPreviewPanel: false
    };

    @Input()
    public content = "";

    @Output()
    public contentChange = new EventEmitter<string>();
}
