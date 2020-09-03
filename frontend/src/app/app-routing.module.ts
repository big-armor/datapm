import { NgModule } from '@angular/core';
import { Routes, RouterModule, UrlSegment, Route } from '@angular/router';
import { CatalogDetailsComponent } from './catalog-details/catalog-details.component';
import { LoginComponent } from './login/login.component';
import { SignupComponent } from './signup/signup.component';
import { MyAccountComponent } from './my-account/my-account.component';
import { AuthGuard } from './helpers/auth-guard';

const staticRoutes:Route[] = [
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
  }
]

const allRoutes: Routes = [
  {
    matcher: (url) => {
      if (url.length > 0 && !staticRoutes.find(s => s.path == url[0].path)) {
        return {
          consumed: url,
          posParams: {
            catalogSlug:url[0]
          }
        };
      }
      return null;
    },
    component: CatalogDetailsComponent
  } as Route
].concat(staticRoutes);

@NgModule({
  providers: [AuthGuard],
  imports: [RouterModule.forRoot(allRoutes)],
  exports: [RouterModule]
})
export class AppRoutingModule {


}
