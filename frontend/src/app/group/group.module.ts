import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTableModule } from "@angular/material/table";
import { MatTabsModule } from "@angular/material/tabs";
import { SharedModule } from "../shared/shared.module";

import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatTooltipModule } from "@angular/material/tooltip";
import { ImportedModule } from "../imported/imported.module";
import { GroupDetailsComponent } from "./group-details/group-details.component";
import { GroupRoutingModule } from "./group-routing.module";
import { GroupPermissionsComponent } from "./group-permissions/group-permissions.component";
import { GroupManageComponent } from "./group-manage/group-manage.component";
import { AddUserComponent } from "./add-user/add-user.component";
import { GroupPackagesComponent } from "./group-packages/group-packages.component";
import { GroupCatalogsComponent } from "./group-catalog/group-catalog.component";
import { GroupCollectionsComponent } from "./group-collection/group-collection.component";

@NgModule({
    declarations: [
        GroupDetailsComponent,
        GroupPermissionsComponent,
        GroupManageComponent,
        AddUserComponent,
        GroupPackagesComponent,
        GroupCatalogsComponent,
        GroupCollectionsComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        GroupRoutingModule,
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
    ],
    exports: []
})
export class GroupModule {}
