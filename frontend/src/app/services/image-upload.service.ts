import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Mutation } from "apollo-angular";
import { ImageUploadModalComponent } from "../shared/image-upload-modal/image-upload-modal.component";

@Injectable({ providedIn: "root" })
export class ImageUploadService {
    public constructor(private dialog: MatDialog) {}

    public openImageUploadDialog(mutation: Mutation): void {
        this.dialog
            .open(ImageUploadModalComponent)
            .afterClosed()
            .subscribe((file) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => mutation.mutate({ image: { base64: reader.result } }).subscribe();
            });
    }
}
