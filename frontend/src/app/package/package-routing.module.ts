import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { PackageComponent } from "./components/package/package.component";
import { PackageDetailComponent } from "./components/package-detail/package-detail.component";
import { PackageSchemaComponent } from "./components/package-schema/package-schema.component";
import { PackageVersionComponent } from "./components/package-version/package-version.component";
import { PackageResolverService } from "./services/package-resolver.service";

const routes: Routes = [
    {
        path: "",
        component: PackageComponent,
        resolve: {
            package: PackageResolverService
        },
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
