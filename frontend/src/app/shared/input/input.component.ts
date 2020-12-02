import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from "@angular/core";
import { FormControl, FormGroup } from "@angular/forms";

@Component({
    selector: "app-input",
    templateUrl: "./input.component.html",
    styleUrls: ["./input.component.scss"]
})
export class InputComponent implements OnInit, OnChanges {
    @Input() set control(c: FormControl) {
        if (c) {
            this.formControl = c;
        }
    }
    @Input() group: FormGroup;
    @Input() controlName: string;
    @Input() placeholder: string = "";
    @Input() inputType: string = "text";
    @Input() error: string = "";
    @Input() autoFocus: boolean = false;
    @Output() inputChange: EventEmitter<string>;
    @Output() keyEnter: EventEmitter<void>;

    formControl: FormControl;

    constructor() {
        this.inputChange = new EventEmitter<string>();
        this.keyEnter = new EventEmitter<void>();
        this.formControl = new FormControl();
    }

    ngOnInit(): void {}

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
