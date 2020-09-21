import { NgModule } from '@angular/core';
import { Routes, RouterModule, UrlSegment, Route } from '@angular/router';
import { CatalogDetailsComponent } from './catalog-details/catalog-details.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { MyAccountComponent } from './my-account/my-account.component';
import { AuthGuard } from './helpers/auth-guard';
import { PackageDetailComponent } from './package-detail/package-detail.component';
import { HomepageComponent } from './homepage/homepage.component';

const staticRoutes:Route[] = [
  {
    path: '',
    redirectTo: "/homepage",
    pathMatch: "full"
  },
  {
    path:'homepage',
    component: HomepageComponent
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
    path: ":catalogSlug",
    component: CatalogDetailsComponent,
    canActivate: [AuthGuard]
  },
  {
    path: ":catalogSlug/:packageSlug",
    component: PackageDetailComponent,
    canActivate: [AuthGuard]
  }
]


@NgModule({
  providers: [AuthGuard],
  imports: [RouterModule.forRoot(staticRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule {


}
