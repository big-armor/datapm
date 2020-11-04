import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";

import { PackageRoutingModule } from "./package-routing.module";

import { PackageComponent } from "./package/package.component";
import { PackageDetailComponent } from "./package-detail/package-detail.component";
import { PackageSchemaComponent } from "./package-schema/package-schema.component";
import { PackageVersionComponent } from "./package-version/package-version.component";

@NgModule({
    declarations: [PackageComponent, PackageDetailComponent, PackageSchemaComponent, PackageVersionComponent],
    imports: [CommonModule, PackageRoutingModule, MatButtonModule, MatExpansionModule, MatIconModule]
})
export class PackageModule {}
