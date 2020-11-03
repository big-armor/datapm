import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";

import { HeaderComponent } from "./header/header.component";
import { FooterComponent } from "./footer/footer.component";
import { MaterialModule } from "../material.module";
import { TimeAgoPipe } from "./pipes/time-ago.pipe";
import { ImageUploadModalComponent } from "./image-upload-modal/image-upload-modal.component";
import { PackageItemComponent } from "./package-item/package-item.component";
import { ForgotPasswordDialogComponent } from "./header/forgot-password-dialog/forgot-password-dialog.component";
import { LoginDialogComponent } from "./header/login-dialog/login-dialog.component";
import { SignUpDialogComponent } from "./header/sign-up-dialog/sign-up-dialog.component";

@NgModule({
    declarations: [
        HeaderComponent,
        FooterComponent,
        TimeAgoPipe,
        ImageUploadModalComponent,
        PackageItemComponent,
        ForgotPasswordDialogComponent,
        LoginDialogComponent,
        SignUpDialogComponent
    ],
    imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, RouterModule],
    exports: [
        HeaderComponent,
        FooterComponent,
        TimeAgoPipe,
        PackageItemComponent,
        ForgotPasswordDialogComponent,
        LoginDialogComponent,
        SignUpDialogComponent
    ],
    providers: [TimeAgoPipe]
})
export class SharedModule {}
