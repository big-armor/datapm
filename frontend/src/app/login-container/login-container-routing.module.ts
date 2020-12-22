import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

// import { LoginDialogComponent } from "../shared/header/login-dialog/login-dialog.component";
import { LoginContainerComponent } from "./login-container.component";

const routes: Routes = [
    {
        path: "",
        component: LoginContainerComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class LoginContainerRoutingModule {}
