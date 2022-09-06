import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
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
import { MatStepperModule } from "@angular/material/stepper";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { CollectionFollowersComponent } from "./collection-details/collection-followers/collection-followers.component";
import { AddGroupCollectionPermissionsComponent } from "./add-group-collection-permissions/add-group-collection-permissions.component";
@NgModule({
    declarations: [
        CollectionDetailsComponent,
        AddPackageComponent,
        AddUserComponent,
        CollectionPermissionsComponent,
        CollectionFollowersComponent,
        AddGroupCollectionPermissionsComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        CollectionDetailsRoutingModule,
        SharedModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
        MatTabsModule,
        MatSelectModule,
        MatTableModule,
        MatSlideToggleModule,
        MatButtonModule,
        MatStepperModule,
        MatInputModule,
        MatFormFieldModule
    ]
})
export class CollectionDetailsModule {}
