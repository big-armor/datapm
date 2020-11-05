import { Component, OnInit } from "@angular/core";
import { MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: "app-image-upload-modal",
    templateUrl: "./image-upload-modal.component.html",
    styleUrls: ["./image-upload-modal.component.scss"]
})
export class ImageUploadModalComponent {
    public constructor(public dialogRef: MatDialogRef<ImageUploadModalComponent>) {}

    public onFileSelect(event: any): void {
        this.dialogRef.close(event.target.files[0]);
    }
}
