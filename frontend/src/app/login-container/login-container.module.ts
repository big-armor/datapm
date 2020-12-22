import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";

import { LoginContainerRoutingModule } from "./login-container-routing.module";
import { LoginContainerComponent } from './login-container.component';

@NgModule({
    declarations: [LoginContainerComponent],
    imports: [CommonModule, MatDialogModule, LoginContainerRoutingModule],
    providers: [
        {
            provide: MatDialogRef,
            useValue: {}
        }
    ]
})
export class LoginContainerModule {}
