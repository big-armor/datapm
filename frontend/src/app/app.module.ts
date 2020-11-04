import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { HttpClientModule } from "@angular/common/http";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { BrowserAnimationsModule } from "@angular/platform-browser/animations";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { GraphQLModule } from "./graphql.module";
import { PackageDetailComponent } from "./package/package-detail/package-detail.component";
import { MaterialModule } from "./material.module";
import { SharedModule } from "./shared/shared.module";
import { PackageComponent } from "./package/package.component";
import { PackageVersionComponent } from "./package/package-version/package-version.component";
import { PackageSchemaComponent } from "./package/package-schema/package-schema.component";

@NgModule({
    declarations: [
        AppComponent,
        PackageDetailComponent,
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
