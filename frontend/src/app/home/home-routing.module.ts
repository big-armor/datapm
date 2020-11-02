import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { FollowingComponent } from "./following/following.component";
import { HomepageComponent } from "./homepage/homepage.component";
import { LatestComponent } from "./latest/latest.component";
import { TrendingComponent } from "./trending/trending.component";

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
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class HomeRoutingModule {}
