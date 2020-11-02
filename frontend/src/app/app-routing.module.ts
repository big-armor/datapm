import { NgModule } from "@angular/core";
import { Routes, RouterModule, UrlSegment, Route } from "@angular/router";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";
import { MyAccountComponent } from "./my-account/my-account.component";
import { AuthGuard } from "./helpers/auth-guard";
import { PackageDetailComponent } from "./package/package-detail/package-detail.component";
import { SearchComponent } from "./search/search.component";
import { PackageComponent } from "./package/package.component";
import { PackageVersionComponent } from "./package/package-version/package-version.component";
import { PackageSchemaComponent } from "./package/package-schema/package-schema.component";
import { DetailsComponent } from "./my-account/details/details.component";
import { PackagesComponent } from "./my-account/packages/packages.component";
import { ActivityComponent } from "./my-account/activity/activity.component";
import { CatalogsComponent } from "./my-account/catalogs/catalogs.component";

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
        component: MyAccountComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: "details",
                redirectTo: "",
                pathMatch: "full"
            },
            {
                path: "",
                component: DetailsComponent
            },
            {
                path: "packages",
                component: PackagesComponent
            },
            {
                path: "activity",
                component: ActivityComponent
            },
            {
                path: "catalogs",
                component: CatalogsComponent
            }
        ]
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
