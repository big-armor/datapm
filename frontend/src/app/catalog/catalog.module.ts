import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTableModule } from "@angular/material/table";
import { MatTabsModule } from "@angular/material/tabs";
import { SharedModule } from "../shared/shared.module";

import { CatalogRoutingModule } from "./catalog-routing.module";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";
import { CatalogComponent } from "./catalog/catalog.component";
import { UserDetailsPageComponent } from "./user-details-page/user-details-page.component";
import { AddUserComponent } from "./add-user/add-user.component";
import { CatalogPermissionsComponent } from "./catalog-permissions/catalog-permissions.component";
import { MatAutocompleteModule } from "@angular/material/autocomplete";

@NgModule({
    declarations: [
        CatalogComponent,
        CatalogDetailsComponent,
        UserDetailsPageComponent,
        AddUserComponent,
        CatalogPermissionsComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        CatalogRoutingModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
        MatSlideToggleModule,
        MatTableModule,
        MatTabsModule,
        SharedModule
    ]
})
export class CatalogModule {}
