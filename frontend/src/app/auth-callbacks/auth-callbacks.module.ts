import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { SharedModule } from "../shared/shared.module";
import { AuthCallbacksRoutingModule } from "./auth-callbacks-routing.module";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";
import { PasswordRecoveryComponent } from "./password-recovery/password-recovery.component";
import { AcceptInviteComponent } from "./accept-invite/accept-invite.component";

@NgModule({
    declarations: [VerifyEmailComponent, PasswordRecoveryComponent, AcceptInviteComponent],
    imports: [
        CommonModule,
        AuthCallbacksRoutingModule,
        ReactiveFormsModule,
        FormsModule,
        MatDialogModule,
        MatIconModule,
        MatProgressSpinnerModule,
        SharedModule
    ],
    providers: [
        {
            provide: MatDialogRef,
            useValue: {}
        }
    ]
})
export class AuthCallbacksModule {}
