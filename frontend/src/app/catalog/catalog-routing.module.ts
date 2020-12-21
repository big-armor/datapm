import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";
import { CatalogComponent } from "./catalog/catalog.component";

const routes: Routes = [
    {
        path: ":catalogSlug",
        component: CatalogComponent,
        children: [
            {
                path: "",
                component: CatalogDetailsComponent
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class CatalogRoutingModule {}
