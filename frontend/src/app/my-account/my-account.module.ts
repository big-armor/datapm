import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTableModule } from "@angular/material/table";

import { MyAccountRoutingModule } from "./my-account-routing.module";
import { MyAccountComponent } from "./my-account/my-account.component";
import { ActivityComponent } from "./activity/activity.component";
import { CatalogsComponent } from "./catalogs/catalogs.component";
import { ConfirmationDialogComponent } from "./confirmation-dialog/confirmation-dialog.component";
import { DetailsComponent } from "./details/details.component";
import { EditAccountDialogComponent } from "./edit-account-dialog/edit-account-dialog.component";
import { EditPasswordDialogComponent } from "./edit-password-dialog/edit-password-dialog.component";
import { PackagesComponent } from "./packages/packages.component";

@NgModule({
    declarations: [
        MyAccountComponent,
        ActivityComponent,
        CatalogsComponent,
        ConfirmationDialogComponent,
        DetailsComponent,
        EditAccountDialogComponent,
        EditPasswordDialogComponent,
        PackagesComponent
    ],
    imports: [
        CommonModule,
        MyAccountRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatDialogModule,
        MatIconModule,
        MatSlideToggleModule,
        MatTableModule
    ]
})
export class MyAccountModule {}
