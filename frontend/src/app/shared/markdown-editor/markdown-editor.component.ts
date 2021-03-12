import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from "@angular/core";
import { EditorComponent } from "angular-simplemde";

@Component({
    selector: "app-markdown-editor",
    templateUrl: "./markdown-editor.component.html",
    styleUrls: ["./markdown-editor.component.scss"]
})
export class MarkdownEditorComponent {
    @ViewChild("editor")
    private editor: EditorComponent;

    @Input()
    public content = "";

    @Output()
    public contentChange = new EventEmitter<string>();

    public setValue(value: string): void {
        this.editor.mde.codemirror.setValue(value);
        this.refresh();
    }

    public refresh(): void {
        setTimeout(() => this.editor.mde.codemirror.refresh());
    }
}
