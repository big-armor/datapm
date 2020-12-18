import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { CatalogComponent } from "./catalog/catalog.component";

const routes: Routes = [
    {
        path: ":catalogSlug",
        component: CatalogComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class CatalogRoutingModule {}
