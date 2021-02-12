import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";
import { MatAutocomplete } from "@angular/material/autocomplete";

type InputComponentStyle = "square" | "flat";

@Component({
    selector: "app-input",
    templateUrl: "./input.component.html",
    styleUrls: ["./input.component.scss"]
})
export class InputComponent implements OnChanges {
    @Input() set control(c: FormControl) {
        if (c) {
            this.formControl = c;
        }
    }
    @Input() group: FormGroup;
    @Input() controlName: string;
    @Input() placeholder: string = "";
    @Input() inputType: string = "text";
    @Input() multiline: boolean = false;
    @Input() error: string = "";
    @Input() inputStyle: InputComponentStyle = "square";
    @Input() autoFocus: boolean = false;
    @Input() matAutocomplete: MatAutocomplete;
    @Output() inputChange: EventEmitter<string>;
    @Output() keyEnter: EventEmitter<void>;
    @Output() focus: EventEmitter<any>;
    @Output() blur: EventEmitter<any>;

    formControl: FormControl;

    constructor() {
        this.inputChange = new EventEmitter<string>();
        this.keyEnter = new EventEmitter<void>();
        this.focus = new EventEmitter<any>();
        this.blur = new EventEmitter<any>();
        this.formControl = new FormControl();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.group?.currentValue && changes.controlName?.currentValue) {
            this.formControl = changes.group.currentValue.get(changes.controlName.currentValue);
        }
    }

    handleInputChange(ev: any) {
        this.inputChange.emit(ev?.target?.value || "");
    }

    handleKeyUp(ev: any) {
        if (ev.keyCode === 13) {
            this.keyEnter.emit();
        }
    }
}
