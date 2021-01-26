import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

export interface FileSelectedEvent {
    id: string;
    files: File[];
}

@Injectable({
    providedIn: "root"
})
export class FileService {
    public selectedFiles = new Subject<FileSelectedEvent>();
    private input: HTMLInputElement;

    constructor() {
        const input = document.createElement("input");
        input.type = "file";
        input.style.position = "absolute";
        input.style.opacity = "0";
        input.style["pointer-events"] = "none";
        this.input = input;
    }

    openFile(accept: string = "*", multiple?: boolean) {
        this.input.multiple = multiple;
        this.input.accept = accept;
        this.input.value = null;

        const eventId = Math.random().toString().replace("0.", "");
        const handler = () => {
            this.input.removeEventListener("change", handler);

            if (this.input.files.length === 0) {
                return;
            }

            const files: File[] = [];
            for (let i = 0; i < this.input.files.length; ++i) {
                files.push(this.input.files.item(i));
            }

            this.input.value = null;

            this.selectedFiles.next({
                id: eventId,
                files
            });
        };

        this.input.addEventListener("change", handler);
        this.input.click();

        return eventId;
    }
}
