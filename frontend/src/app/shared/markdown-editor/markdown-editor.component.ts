import { Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import {
    DefaultFontActions,
    DefaultHtmlActions,
    DefaultNumerationActions,
    DefaultSimpleMdeActions,
    EditorComponent,
    ISimpleMdeConfig
} from "angular-simplemde";

@Component({
    selector: "app-markdown-editor",
    templateUrl: "./markdown-editor.component.html",
    styleUrls: ["./markdown-editor.component.scss"]
})
export class MarkdownEditorComponent {
    public readonly config: ISimpleMdeConfig = {
        actions: [
            ...DefaultFontActions,
            "|",
            ...DefaultNumerationActions,
            "|",
            ...DefaultHtmlActions.slice(1),
            "|",
            ...DefaultSimpleMdeActions.slice(0, DefaultSimpleMdeActions.length - 1)
        ]
    };

    @ViewChild("editor")
    private editor: EditorComponent;

    @Input()
    public content = "";

    @Output()
    public contentChange = new EventEmitter<string>();

    public setValue(value: string, focus?: boolean): void {
        this.editor.mde.codemirror.setValue(value);
        setTimeout(() => {
            if (focus) {
                this.editor.mde.codemirror.focus();
                this.editor.mde.codemirror.setCursor(value.length, 0);
            }
            this.editor.mde.codemirror.refresh();
        });
    }

    public insertQuote(value: string): void {
        let content = this.content;

        const sentences = value.split("\n");
        const quotedSentences = sentences.map((s) => {
            let sentence = s;
            if (s.trim().length) {
                sentence = " > " + s + "\n";
            }
            return sentence;
        });
        content += quotedSentences.join("\n") + "\n";
        this.content = content;
        this.setValue(this.content, true);
    }
}
