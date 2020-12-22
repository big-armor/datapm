import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { SharedModule } from "../shared/shared.module";

import { CatalogRoutingModule } from "./catalog-routing.module";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";
import { CatalogComponent } from "./catalog/catalog.component";
import { UserDetailsComponent } from "./user-details/user-details.component";

@NgModule({
    declarations: [CatalogComponent, CatalogDetailsComponent, UserDetailsComponent],
    imports: [CommonModule, CatalogRoutingModule, MatProgressSpinnerModule, MatTabsModule, SharedModule]
})
export class CatalogModule {}
