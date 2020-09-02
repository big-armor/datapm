import { NgModule } from '@angular/core';
import { Routes, RouterModule, UrlSegment } from '@angular/router';
import { CatalogDetailsComponent } from './catalog-details/catalog-details.component';
import { LoginComponent } from './login/login.component';

const routes: Routes = [
  {
    matcher: (url) => {
      if (url.length > 0 && url[0].path != "login") {
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
  }, {
    path: "login",
    component: LoginComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {


}
