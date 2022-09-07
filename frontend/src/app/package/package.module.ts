import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
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
import { PackageFileUpdateMethodPipe } from "./pipes/package-file-update-method.pipe";
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
import { DownloadPackageComponent } from "./components/package-info/download-package/download-package.component";
import { ClientWizardComponent } from "./components/package-info/download-package/client-wizard/client-wizard.component";
import { MatStepperModule } from "@angular/material/stepper";
import { MatSelectModule } from "@angular/material/select";
import { PackageIssuesComponent } from "./components/package-issues/package-issues.component";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { PackageIssuesDetailComponent } from "./components/package-issues/package-issues-detail/package-issues-detail.component";
import { MatMenuModule } from "@angular/material/menu";
import { CreatePackageIssueComponent } from "./components/package-issues/create-package-issue/create-package-issue.component";
import { VersionComparisonModalComponent } from "./components/package-version/version-comparison-modal/version-comparison-modal.component";
import { EditPropertyDialogComponent } from "./components/package-schema/edit-property-dialog/edit-property-dialog.component";
import { EditPackageMarkdownComponent } from "./components/edit-package-markdown/edit-package-markdown.component";
import { EditWebsiteDialogComponent } from "./components/package-info/edit-website-dialog/edit-website-dialog.component";
import { PackageFollowersComponent } from "./components/package-followers/package-followers.component";
import { AddGroupPackagePermissionsComponent } from "../group/add-group-package-permissions/add-group-package-permissions.component";

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
        PackageFileUpdateMethodPipe,
        PackageInfoComponent,
        PackagePermissionComponent,
        AddUserComponent,
        PackageDeletionConfirmationComponent,
        DownloadPackageComponent,
        ClientWizardComponent,
        PackageIssuesComponent,
        PackageIssuesDetailComponent,
        CreatePackageIssueComponent,
        VersionComparisonModalComponent,
        EditPropertyDialogComponent,
        EditPackageMarkdownComponent,
        EditWebsiteDialogComponent,
        PackageFollowersComponent,
        AddGroupPackagePermissionsComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PackageRoutingModule,
        MatButtonModule,
        MatExpansionModule,
        MatIconModule,
        MatTabsModule,
        MatChipsModule,
        MatInputModule,
        MatMenuModule,
        MatDialogModule,
        MatCheckboxModule,
        MatSlideToggleModule,
        MatTableModule,
        MatAutocompleteModule,
        MatProgressSpinnerModule,
        SharedModule,
        MatSelectModule,
        ScrollingModule,
        MatSelectModule,
        MatStepperModule,
        TableVirtualScrollModule,
        MarkdownModule.forChild(),
        MatTooltipModule
    ]
})
export class PackageModule {}
