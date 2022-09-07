import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { FollowingComponent } from "./following/following.component";
import { HomepageComponent } from "./homepage/homepage.component";
import { LatestComponent } from "./latest/latest.component";
import { TrendingComponent } from "./trending/trending.component";
import { AdminDashboardComponent } from "./admin-dashboard/admin-dashboard.component";
import { UsersComponent } from "./admin-dashboard/users/users.component";
import { AuthGuard } from "../helpers/auth-guard";
import { RecentlyViewedComponent } from "./recently-viewed/recently-viewed.component";
import { PlatformSettingsComponent } from "./admin-dashboard/platform-settings/platform-settings.component";
import { GroupsComponent } from "./admin-dashboard/groups/groups.component";

const routes: Routes = [
    {
        path: "",
        component: HomepageComponent,
        children: [
            {
                path: "",
                component: LatestComponent
            },
            {
                path: "viewed",
                component: RecentlyViewedComponent
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
            },
            {
                path: "groups",
                component: GroupsComponent
            },
            {
                path: "platform-settings",
                component: PlatformSettingsComponent
            }
        ]
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HomeRoutingModule {}
