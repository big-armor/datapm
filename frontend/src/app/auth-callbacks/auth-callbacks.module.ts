import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { SharedModule } from "../shared/shared.module";
import { AuthCallbacksRoutingModule } from "./auth-callbacks-routing.module";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";
import { PasswordRecoveryComponent } from "./password-recovery/password-recovery.component";

@NgModule({
    declarations: [VerifyEmailComponent, PasswordRecoveryComponent],
    imports: [
        CommonModule,
        AuthCallbacksRoutingModule,
        FormsModule,
        MatDialogModule,
        MatIconModule,
        MatProgressSpinnerModule,
        SharedModule
    ]
})
export class AuthCallbacksModule {}
