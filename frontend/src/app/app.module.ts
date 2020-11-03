import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { GraphQLModule } from "./graphql.module";
import { CatalogDetailsComponent } from "./catalog-details/catalog-details.component";
import { PackageDetailComponent } from "./package/package-detail/package-detail.component";
import { MaterialModule } from "./material.module";
import { SharedModule } from "./shared/shared.module";
import { SearchComponent } from "./search/search.component";
import { PackageComponent } from "./package/package.component";
import { PackageVersionComponent } from "./package/package-version/package-version.component";
import { PackageSchemaComponent } from "./package/package-schema/package-schema.component";

@NgModule({
    declarations: [
        AppComponent,
        CatalogDetailsComponent,
        PackageDetailComponent,
        SearchComponent,
        PackageComponent,
        PackageVersionComponent,
        PackageSchemaComponent
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        GraphQLModule,
        HttpClientModule,
        ReactiveFormsModule,
        FormsModule,
        SharedModule,
        MaterialModule
    ],
    providers: [],
    bootstrap: [AppComponent],
    entryComponents: [],
    schemas: []
})
export class AppModule {}
