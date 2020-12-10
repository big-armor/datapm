import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { CollectionDetailsComponent } from "./collection-details/collection-details.component";

const routes: Routes = [
    {
        path: "",
        component: CollectionDetailsComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class CollectionDetailsRoutingModule {}
