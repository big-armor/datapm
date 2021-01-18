import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { FollowingComponent } from "./following/following.component";
import { HomepageComponent } from "./homepage/homepage.component";
import { LatestComponent } from "./latest/latest.component";
import { TrendingComponent } from "./trending/trending.component";
import { AdminDashboardComponent } from "./admin-dashboard/admin-dashboard.component";
import { UsersComponent } from "./admin-dashboard/users/users.component";
import { AuthGuard } from "../helpers/auth-guard";

const routes: Routes = [
    {
        path: "",
        component: HomepageComponent,
        children: [
            {
                path: "",
                pathMatch: "full",
                redirectTo: "latest"
            },
            {
                path: "latest",
                component: LatestComponent
            },
            {
                path: "trending",
                component: TrendingComponent
            },
            {
                path: "following",
                component: FollowingComponent
            }
        ]
    },
    {
        path: "admin",
        component: AdminDashboardComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: "",
                pathMatch: "full",
                redirectTo: "users"
            },
            {
                path: "users",
                component: UsersComponent
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HomeRoutingModule {}
