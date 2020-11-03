import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { VerifyEmailRoutingModule } from "./verify-email-routing.module";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";
import { FormsModule } from "@angular/forms";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";

@NgModule({
    declarations: [VerifyEmailComponent],
    imports: [CommonModule, FormsModule, VerifyEmailRoutingModule, MatDialogModule, MatIconModule]
})
export class VerifyEmailModule {}
