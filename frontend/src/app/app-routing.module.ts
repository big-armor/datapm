import { NgModule } from "@angular/core";
import { RouterModule, Route } from "@angular/router";
import { AuthGuard } from "./helpers/auth-guard";

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
        loadChildren: () => import("./my-account/my-account.module").then((m) => m.MyAccountModule),
        canActivate: [AuthGuard]
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
        loadChildren: () => import("./package/package.module").then((m) => m.PackageModule)
    }
];

@NgModule({
    imports: [RouterModule.forRoot(staticRoutes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
