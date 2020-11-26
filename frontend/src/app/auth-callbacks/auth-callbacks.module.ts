import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";

import { AuthCallbacksRoutingModule } from "./auth-callbacks-routing.module";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";

@NgModule({
    declarations: [VerifyEmailComponent],
    imports: [CommonModule, AuthCallbacksRoutingModule, FormsModule, MatDialogModule, MatIconModule]
})
export class AuthCallbacksModule {}
