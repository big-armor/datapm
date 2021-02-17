import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { AcceptInviteComponent } from "./accept-invite/accept-invite.component";
import { PasswordRecoveryComponent } from "./password-recovery/password-recovery.component";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";

const routes: Routes = [
    {
        path: "validate-email",
        component: VerifyEmailComponent
    },
    {
        path: "accept-invite",
        component: AcceptInviteComponent
    },
    {
        path: "password-recovery",
        component: PasswordRecoveryComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AuthCallbacksRoutingModule {}
