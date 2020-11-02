import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { HomeRoutingModule } from "./home-routing.module";
import { HomepageComponent } from "./homepage/homepage.component";
import { FollowingComponent } from "./following/following.component";
import { LatestComponent } from "./latest/latest.component";
import { TrendingComponent } from "./trending/trending.component";

@NgModule({
    declarations: [FollowingComponent, HomepageComponent, LatestComponent, TrendingComponent],
    imports: [CommonModule, HomeRoutingModule]
})
export class HomeModule {}
