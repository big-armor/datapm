import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { PackageComponent } from "./package/package.component";
import { PackageDetailComponent } from "./package-detail/package-detail.component";
import { PackageSchemaComponent } from "./package-schema/package-schema.component";
import { PackageVersionComponent } from "./package-version/package-version.component";

const routes: Routes = [
    {
        path: "",
        component: PackageComponent,
        children: [
            {
                path: "details",
                component: PackageDetailComponent
            },
            {
                path: "version",
                component: PackageVersionComponent
            },
            {
                path: "schema",
                component: PackageSchemaComponent
            },
            {
                path: "**",
                redirectTo: "details"
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PackageRoutingModule {}
