import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { GraphQLModule } from './graphql.module';
import { HttpClientModule } from '@angular/common/http';
import { CatalogDetailsComponent } from './catalog-details/catalog-details.component';
import { LoginComponent } from './login/login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SignupComponent } from './signup/signup.component';
import { MyAccountComponent } from './my-account/my-account.component';
import { PackageDetailComponent } from './package-detail/package-detail.component';
import { FormsModule } from '@angular/forms';
import { MaterialModule } from './material.module';
import { HomepageComponent } from './homepage/homepage.component';
import { SharedComponent } from './shared/shared.component';
import { SharedModule } from './shared/shared.module';
import { TrendingComponent } from './homepage/trending/trending.component';
import { LoginDialogComponent } from './shared/header/login-dialog/login-dialog.component';
import { SignUpDialogComponent } from './shared/header/sign-up-dialog/sign-up-dialog.component';
import { LatestComponent } from './homepage/latest/latest.component';
import { SearchComponent } from './search/search.component';
import { FollowingComponent } from './homepage/following/following.component';

@NgModule({
  declarations: [
    AppComponent,
    CatalogDetailsComponent,
    LoginComponent,
    SignupComponent,
    MyAccountComponent,
    PackageDetailComponent,
    HomepageComponent,
    SharedComponent,
    TrendingComponent,
    LoginDialogComponent,
    SignUpDialogComponent,
    LatestComponent,
    SearchComponent,
    FollowingComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    GraphQLModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    MaterialModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
  entryComponents: [LoginDialogComponent, SignUpDialogComponent]
})
export class AppModule { }
