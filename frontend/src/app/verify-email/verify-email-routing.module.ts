import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { VerifyEmailComponent } from "./verify-email/verify-email.component";

const routes: Routes = [
    {
        path: "",
        component: VerifyEmailComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class VerifyEmailRoutingModule {}
