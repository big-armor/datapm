import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { PackageComponent } from "./components/package/package.component";
import { PackageDescriptionComponent } from "./components/package-description/package-description.component";
import { PackageSchemaComponent } from "./components/package-schema/package-schema.component";
import { PackageVersionComponent } from "./components/package-version/package-version.component";
import { PackageSamplesComponent } from "./components/package-samples/package-samples.component";

const routes: Routes = [
    {
        path: "",
        component: PackageComponent,
        children: [
            {
                path: "",
                component: PackageDescriptionComponent,
                pathMatch: "full"
            },
            {
                path: "history",
                component: PackageVersionComponent
            },
            {
                path: "schema",
                component: PackageSchemaComponent
            },
            {
                path: "preview",
                component: PackageSamplesComponent
            },
            {
                path: "**",
                redirectTo: "description"
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PackageRoutingModule {}
