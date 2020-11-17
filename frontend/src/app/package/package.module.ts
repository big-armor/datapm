import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatTabsModule } from "@angular/material/tabs";

import { PackageRoutingModule } from "./package-routing.module";
import { SharedModule } from "../shared/shared.module";

import { PackageComponent } from "./components/package/package.component";
import { PackageDetailComponent } from "./components/package-detail/package-detail.component";
import { PackageSchemaComponent } from "./components/package-schema/package-schema.component";
import { PackageVersionComponent } from "./components/package-version/package-version.component";

@NgModule({
    declarations: [PackageComponent, PackageDetailComponent, PackageSchemaComponent, PackageVersionComponent],
    imports: [
        CommonModule,
        PackageRoutingModule,
        MatButtonModule,
        MatExpansionModule,
        MatIconModule,
        MatTabsModule,
        SharedModule
    ]
})
export class PackageModule {}
