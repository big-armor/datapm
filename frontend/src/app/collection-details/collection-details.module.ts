import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { MatTableModule } from "@angular/material/table";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatButtonModule } from "@angular/material/button";

import { SharedModule } from "../shared/shared.module";

import { CollectionDetailsRoutingModule } from "./collection-details-routing.module";
import { CollectionDetailsComponent } from "./collection-details/collection-details.component";
import { AddPackageComponent } from "./add-package/add-package.component";
import { AddUserComponent } from "./add-user/add-user.component";
import { CollectionPermissionsComponent } from "./collection-permissions/collection-permissions.component";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatSelectModule } from "@angular/material/select";

@NgModule({
    declarations: [CollectionDetailsComponent, AddPackageComponent, AddUserComponent, CollectionPermissionsComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        CollectionDetailsRoutingModule,
        SharedModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
        MatTabsModule,
        MatSelectModule,
        MatTableModule,
        MatSlideToggleModule,
        MatButtonModule
    ]
})
export class CollectionDetailsModule {}
