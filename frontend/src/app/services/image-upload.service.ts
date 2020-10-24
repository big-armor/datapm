import {Injectable} from "@angular/core";
import {MatDialog} from "@angular/material/dialog";
import {Apollo} from "apollo-angular";
import {ImageUploadModalComponent} from "../shared/image-upload-modal/image-upload-modal.component";

@Injectable({ providedIn: 'root' })
export class ImageUploadService {

  public constructor(private dialog: MatDialog) {
  }

  public openImageUploadDialog(mutation: Apollo.Mutation): void {
    this.dialog.open(ImageUploadModalComponent).afterClosed()
      .subscribe((result) => mutation.mutate({image: result}, {context: {useMultipart: true}}).subscribe());
  }
}
