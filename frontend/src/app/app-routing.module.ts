import { NgModule } from "@angular/core";
import { RouterModule, Route } from "@angular/router";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";
import { AuthGuard } from "./helpers/auth-guard";
import { PackageDetailComponent } from "./package/package-detail/package-detail.component";
import { SearchComponent } from "./search/search.component";
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
        component: SearchComponent
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
        component: CatalogDetailsComponent
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
