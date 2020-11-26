import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { PasswordRecoveryComponent } from "./password-recovery/password-recovery.component";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";

const routes: Routes = [
    {
        path: "validate-email",
        component: VerifyEmailComponent
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
