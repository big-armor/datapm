import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialogModule } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTableModule } from "@angular/material/table";

import { SharedModule } from "../shared/shared.module";
import { MyAccountRoutingModule } from "./my-account-routing.module";
import { MyAccountComponent } from "./my-account/my-account.component";
import { ActivityComponent } from "./activity/activity.component";
import { MyCollectionsComponent } from "./my-collections/my-collections.component";

import { CatalogsComponent } from "./catalogs/catalogs.component";
import { ConfirmationDialogComponent } from "./confirmation-dialog/confirmation-dialog.component";
import { DetailsComponent } from "./details/details.component";
import { EditAccountDialogComponent } from "./edit-account-dialog/edit-account-dialog.component";
import { EditPasswordDialogComponent } from "./edit-password-dialog/edit-password-dialog.component";
import { PackagesComponent } from "./packages/packages.component";
import { DeleteConfirmationComponent } from "./delete-confirmation/delete-confirmation.component";
import { FewPackagesAlertComponent } from "./few-packages-alert/few-packages-alert.component";

@NgModule({
    declarations: [
        MyAccountComponent,
        ActivityComponent,
        CatalogsComponent,
        ConfirmationDialogComponent,
        DetailsComponent,
        EditAccountDialogComponent,
        EditPasswordDialogComponent,
        PackagesComponent,
        DeleteConfirmationComponent,
        MyCollectionsComponent,
        FewPackagesAlertComponent
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
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSlideToggleModule,
        MatProgressSpinnerModule,
        MatTableModule,
        SharedModule
    ]
})
export class MyAccountModule {}
