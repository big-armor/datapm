import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";

export type ButtonType = "raised" | "link";

@Component({
    selector: "app-button",
    templateUrl: "./button.component.html",
    styleUrls: ["./button.component.scss"]
})
export class ButtonComponent implements OnInit {
    @Input() type: ButtonType = "link";
    @Input() disabled: boolean = false;
    @Output() buttonClick = new EventEmitter();

    constructor() {}

    ngOnInit(): void {}

    handleClick() {
        if (!this.disabled) {
            this.buttonClick.emit();
        }
    }
}
