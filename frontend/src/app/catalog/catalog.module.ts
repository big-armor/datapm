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
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ImportedModule } from "../imported/imported.module";
import { CatalogFollowersComponent } from "./catalog-details/catalog-followers/catalog-followers.component";
import { AddGroupCatalogPermissionsComponent } from "../group/add-group-catalog-permissions/add-group-catalog-permissions.component";

@NgModule({
    declarations: [
        CatalogComponent,
        CatalogDetailsComponent,
        UserDetailsPageComponent,
        AddUserComponent,
        CatalogPermissionsComponent,
        CatalogFollowersComponent,
        AddGroupCatalogPermissionsComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        CatalogRoutingModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
        MatSlideToggleModule,
        MatSelectModule,
        MatTableModule,
        MatSelectModule,
        MatTabsModule,
        MatInputModule,
        MatTooltipModule,
        MatFormFieldModule,
        ImportedModule,
        SharedModule
    ]
})
export class CatalogModule {}
