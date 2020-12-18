import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { CatalogRoutingModule } from "./catalog-routing.module";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";
import { UserDetailsComponent } from "./user-details/user-details.component";
import { CatalogComponent } from "./catalog/catalog.component";

@NgModule({
    declarations: [CatalogDetailsComponent, UserDetailsComponent, CatalogComponent],
    imports: [CommonModule, CatalogRoutingModule]
})
export class CatalogModule {}
