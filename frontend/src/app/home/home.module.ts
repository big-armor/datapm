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
import { AdminDashboardComponent } from "./admin-dashboard/admin-dashboard.component";
import { UsersComponent } from "./admin-dashboard/users/users.component";
import { GroupsComponent } from "./admin-dashboard/groups/groups.component";
import { MatTableModule } from "@angular/material/table";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatFormFieldModule } from "@angular/material/form-field";
import { FormsModule } from "@angular/forms";
import { MatInputModule } from "@angular/material/input";
import { MatStepperModule } from "@angular/material/stepper";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { PlatformSettingsComponent } from "./admin-dashboard/platform-settings/platform-settings.component";
import { AdminStatusConfirmationComponent } from "./admin-dashboard/users/admin-status-confirmation/admin-status-confirmation.component";
import { GroupAdminConfirmationComponent } from "./admin-dashboard/groups/admin-status-confirmation/admin-status-confirmation.component";

@NgModule({
    declarations: [
        FollowingComponent,
        HomepageComponent,
        LatestComponent,
        TrendingComponent,
        AdminDashboardComponent,
        UsersComponent,
        GroupsComponent,
        RecentlyViewedComponent,
        PlatformSettingsComponent,
        AdminStatusConfirmationComponent,
        GroupAdminConfirmationComponent
    ],
    imports: [
        CommonModule,
        HomeRoutingModule,
        MatButtonModule,
        MatCardModule,
        MatChipsModule,
        MatIconModule,
        SharedModule,
        MatTableModule,
        MatPaginatorModule,
        MatStepperModule,
        MatProgressSpinnerModule,
        MatFormFieldModule,
        MatTooltipModule,
        MatInputModule,
        FormsModule,
        SharedModule,
        MatSlideToggleModule
    ]
})
export class HomeModule {}
