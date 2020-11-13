import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";

const routes: Routes = [
    {
        path: "",
        component: CatalogDetailsComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class CatalogRoutingModule {}
