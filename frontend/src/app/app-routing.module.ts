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
        path: "collection/:collectionSlug",
        loadChildren: () =>
            import("./collection-details/collection-details.module").then((m) => m.CollectionDetailsModule)
    },
    {
        path: "user/:username",
        loadChildren: () => import("./my-account/my-account.module").then((m) => m.MyAccountModule)
    },
    {
        path: "me",
        loadChildren: () => import("./my-account/my-account.module").then((m) => m.MyAccountModule),
        canActivate: [AuthGuard]
    },
    {
        path: "",
        loadChildren: () => import("./auth-callbacks/auth-callbacks.module").then((m) => m.AuthCallbacksModule)
    },
    // {
    //     path: "",
    //     loadChildren: () => import("./catalog/catalog.module").then((m) => m.CatalogModule)
    // },
    {
        path: ":catalogSlug/:packageSlug",
        loadChildren: () => import("./package/package.module").then((m) => m.PackageModule)
    },
    {
        path: "login",
        loadChildren: () => import("./login-container/login-container.module").then((m) => m.LoginContainerModule)
    }
];

@NgModule({
    imports: [RouterModule.forRoot(staticRoutes)],
    exports: [RouterModule]
})
export class AppRoutingModule {}
