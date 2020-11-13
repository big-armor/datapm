import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { CatalogRoutingModule } from "./catalog-routing.module";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";

@NgModule({
    declarations: [CatalogDetailsComponent],
    imports: [CommonModule, CatalogRoutingModule]
})
export class CatalogModule {}
