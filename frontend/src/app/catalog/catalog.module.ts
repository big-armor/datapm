import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { SharedModule } from "../shared/shared.module";

import { CatalogRoutingModule } from "./catalog-routing.module";
import { CatalogComponent } from "./catalog/catalog.component";

@NgModule({
    declarations: [CatalogComponent],
    imports: [CommonModule, CatalogRoutingModule, MatProgressSpinnerModule, MatTabsModule, SharedModule]
})
export class CatalogModule {}
