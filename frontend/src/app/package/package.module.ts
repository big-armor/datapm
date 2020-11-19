import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatTabsModule } from "@angular/material/tabs";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MarkdownModule } from "ngx-markdown";

import { PackageRoutingModule } from "./package-routing.module";
import { SharedModule } from "../shared/shared.module";

import { PackageComponent } from "./components/package/package.component";
import { PackageDescriptionComponent } from "./components/package-description/package-description.component";
import { PackageSchemaComponent } from "./components/package-schema/package-schema.component";
import { PackageVersionComponent } from "./components/package-version/package-version.component";
import { PackageSizePipe } from "./pipes/package-size.pipe";
import { SchemaPropertiesPipe } from "./pipes/schema-properties.pipe";
import { VersionPipe } from "./pipes/version.pipe";

@NgModule({
    declarations: [
        PackageComponent,
        PackageDescriptionComponent,
        PackageSchemaComponent,
        PackageVersionComponent,
        PackageSizePipe,
        SchemaPropertiesPipe,
        VersionPipe
    ],
    imports: [
        CommonModule,
        PackageRoutingModule,
        MatButtonModule,
        MatExpansionModule,
        MatIconModule,
        MatTabsModule,
        MatProgressSpinnerModule,
        SharedModule,
        MarkdownModule.forChild()
    ]
})
export class PackageModule {}
