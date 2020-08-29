import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { CatalogDetailsComponent } from './catalog-details/catalog-details.component';

const routes: Routes = [
  {
    path: ":catalogSlug",
    component: CatalogDetailsComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {


}
