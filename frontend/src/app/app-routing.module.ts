import { NgModule } from "@angular/core";
import { RouterModule, Route } from "@angular/router";
import { AuthGuard } from "./helpers/auth-guard";
import { PackageDetailComponent } from "./package/package-detail/package-detail.component";
import { PackageComponent } from "./package/package.component";
import { PackageVersionComponent } from "./package/package-version/package-version.component";
import { PackageSchemaComponent } from "./package/package-schema/package-schema.component";

const staticRoutes: Route[] = [
    {
        path: "",
        loadChildren: () => import("./home/home.module").then((m) => m.HomeModule)
    },
    {
        path: "search",
        loadChildren: () => import("./search/search.module").then((m) => m.SearchModule)
    },
    {
        path: "me",
        loadChildren: () => import("./my-account/my-account.module").then((m) => m.MyAccountModule)
    },
    {
        path: "validate-email",
        loadChildren: () => import("./verify-email/verify-email.module").then((m) => m.VerifyEmailModule)
    },
    {
        path: ":catalogSlug",
        loadChildren: () => import("./catalog/catalog.module").then((m) => m.CatalogModule)
    },
    {
        path: ":catalogSlug/:packageSlug",
        component: PackageComponent,
        children: [
            {
                path: "package-details",
                redirectTo: "",
                component: PackageDetailComponent
            },
            {
                path: "",
                component: PackageDetailComponent
            },
            {
                path: "version",
                component: PackageVersionComponent
            },
            {
                path: "schema",
                component: PackageSchemaComponent
            }
        ]
    }
];

@NgModule({
    providers: [AuthGuard],
    imports: [RouterModule.forRoot(staticRoutes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
