import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";

import { SharedModule } from "../shared/shared.module";

import { CollectionDetailsRoutingModule } from "./collection-details-routing.module";
import { CollectionDetailsComponent } from "./collection-details/collection-details.component";

@NgModule({
    declarations: [CollectionDetailsComponent],
    imports: [CommonModule, CollectionDetailsRoutingModule, SharedModule, MatProgressSpinnerModule, MatTabsModule]
})
export class CollectionDetailsModule {}
