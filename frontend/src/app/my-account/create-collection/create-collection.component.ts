import { Component, OnInit } from "@angular/core";
import { FormControl, FormGroup, Validators } from "@angular/forms";
import { MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: "app-create-collection",
    templateUrl: "./create-collection.component.html",
    styleUrls: ["./create-collection.component.scss"]
})
export class CreateCollectionComponent implements OnInit {
    public form: FormGroup;

    constructor(private dialogRef: MatDialogRef<CreateCollectionComponent>) {
        this.form = new FormGroup({
            name: new FormControl("", {
                validators: [Validators.required]
            })
        });
    }

    ngOnInit(): void {}

    submit() {
        this.dialogRef.close(this.form.value);
    }
}
