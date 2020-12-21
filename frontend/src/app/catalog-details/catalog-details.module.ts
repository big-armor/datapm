import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { SharedModule } from "../shared/shared.module";

import { CatalogDetailsRoutingModule } from "./catalog-details-routing.module";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";

@NgModule({
    declarations: [CatalogDetailsComponent],
    imports: [CommonModule, CatalogDetailsRoutingModule, MatProgressSpinnerModule, MatTabsModule, SharedModule]
})
export class CatalogDetailsModule {}
