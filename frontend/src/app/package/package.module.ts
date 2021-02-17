import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatExpansionModule } from "@angular/material/expansion";
import { MatIconModule } from "@angular/material/icon";
import { MatTabsModule } from "@angular/material/tabs";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
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
import { PackageInfoComponent } from "./components/package-info/package-info.component";
import { MatTableModule } from "@angular/material/table";
import { PackageSamplesComponent } from "./components/package-samples/package-samples.component";
import { SamplesComponent } from "./components/package-samples/samples.component";
import { SamplesFullScreenDialog } from "./components/package-samples/samples-fullscreen-dialog.component";
import { ScrollingModule } from "@angular/cdk/scrolling";
import { TableVirtualScrollModule } from "ng-table-virtual-scroll";
import { MatDialogModule } from "@angular/material/dialog";
import { PackagePermissionComponent } from "./components/package-permission/package-permission.component";
import { AddUserComponent } from "./components/add-user/add-user.component";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { PackageDeletionConfirmationComponent } from "./components/package/package-deletion-confirmation/package-deletion-confirmation.component";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatChipsModule } from "@angular/material/chips";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { SharePackageComponent } from "./components/package-info/share-package/share-package.component";
import { DownloadPackageComponent } from "./components/package-info/download-package/download-package.component";
import { ClientWizardComponent } from "./components/package-info/download-package/client-wizard/client-wizard.component";
import { MatStepperModule } from "@angular/material/stepper";

@NgModule({
    declarations: [
        PackageComponent,
        PackageDescriptionComponent,
        PackageSchemaComponent,
        PackageSamplesComponent,
        PackageVersionComponent,
        SamplesComponent,
        SamplesFullScreenDialog,
        PackageSizePipe,
        SchemaPropertiesPipe,
        VersionPipe,
        PackageInfoComponent,
        PackagePermissionComponent,
        AddUserComponent,
        PackageDeletionConfirmationComponent,
        SharePackageComponent,
        DownloadPackageComponent,
        ClientWizardComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        PackageRoutingModule,
        MatButtonModule,
        MatExpansionModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MatInputModule,
        MatDialogModule,
        MatSlideToggleModule,
        MatTableModule,
        MatAutocompleteModule,
        MatProgressSpinnerModule,
        SharedModule,
        MatSelectModule,
        ScrollingModule,
        MatStepperModule,
        TableVirtualScrollModule,
        MarkdownModule.forChild(),
        MatTooltipModule
    ]
})
export class PackageModule {}
