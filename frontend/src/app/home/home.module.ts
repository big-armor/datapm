import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";

import { SharedModule } from "../shared/shared.module";
import { HomeRoutingModule } from "./home-routing.module";
import { HomepageComponent } from "./homepage/homepage.component";
import { FollowingComponent } from "./following/following.component";
import { LatestComponent } from "./latest/latest.component";
import { TrendingComponent } from "./trending/trending.component";
import { RecentlyViewedComponent } from "./recently-viewed/recently-viewed.component";

@NgModule({
    declarations: [FollowingComponent, HomepageComponent, LatestComponent, TrendingComponent, RecentlyViewedComponent],
    imports: [
        CommonModule,
        HomeRoutingModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatIconModule,
        SharedModule
    ]
})
export class HomeModule {}
