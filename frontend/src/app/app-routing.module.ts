import { NgModule } from '@angular/core';
import { Routes, RouterModule, UrlSegment, Route } from '@angular/router';
import { CatalogDetailsComponent } from './package/catalog-details/catalog-details.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { MyAccountComponent } from './my-account/my-account.component';
import { AuthGuard } from './helpers/auth-guard';
import { PackageDetailComponent } from './package/package-detail/package-detail.component';
import { HomepageComponent } from './homepage/homepage.component';
import { SearchComponent } from './search/search.component';
import { TrendingComponent } from './homepage/trending/trending.component';
import { LatestComponent } from './homepage/latest/latest.component';
import { FollowingComponent } from './homepage/following/following.component';
import { PackageComponent } from './package/package.component';
import { PackageVersionComponent } from './package/package-version/package-version.component';

const staticRoutes:Route[] = [
  {
    path: '',
    redirectTo: "home",
    pathMatch: "full"
  },
  {
    path:'home',
    component: HomepageComponent,
    children:[
      {
        path:'trending',
        component: TrendingComponent
      },
      {
        path:'latest',
        component: LatestComponent
      },
      {
        path:'following',
        component: FollowingComponent
      },
    ]
  },
  {
    path: 'search',
    component: SearchComponent
  },
  {
    path: "login",
    component: LoginComponent
  },
  {
    path: "signup",
    component: SignupComponent
  },
  {
    path: "me",
    component: MyAccountComponent,
    canActivate: [AuthGuard]
  },
  {
    path:"package",
    component: PackageComponent,
    children: [
      {
        path: ":catalogSlug",
        component: CatalogDetailsComponent
      },
      {
        path: ":catalogSlug/:packageSlug",
        component: PackageDetailComponent
      },
      {
        path: "package-version",
        component: PackageVersionComponent
      }
    ]
  }
]


@NgModule({
  providers: [AuthGuard],
  imports: [RouterModule.forRoot(staticRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule {


}
