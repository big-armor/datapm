import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";

@Component({
    selector: "app-simple-create",
    templateUrl: "./simple-create.component.html",
    styleUrls: ["./simple-create.component.scss"]
})
export class SimpleCreateComponent implements OnInit {
    @Input() createLabel = "Create";
    @Input() inputPlaceholder = "";
    @Input() errorMessages: any;
    @Input() error: string;
    @Output() submit = new EventEmitter();

    form: FormGroup;
    inputChanged = false;

    constructor() {
        this.form = new FormGroup({
            input: new FormControl("", [Validators.required])
        });

        this.form.valueChanges.subscribe(() => {
            this.inputChanged = true;
        });
    }

    ngOnInit(): void {}

    submitForm() {
        if (this.form.invalid) {
            return;
        }

        this.inputChanged = false;
        this.submit.emit(this.form.value);
        this.form.reset();
    }
}
