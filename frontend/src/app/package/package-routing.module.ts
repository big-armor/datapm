import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";

import { PackageComponent } from "./components/package/package.component";
import { PackageDescriptionComponent } from "./components/package-description/package-description.component";
import { PackageVersionComponent } from "./components/package-version/package-version.component";
import { PackagePermissionComponent } from "./components/package-permission/package-permission.component";
import { PackageDeletionConfirmationComponent } from "./components/package/package-deletion-confirmation/package-deletion-confirmation.component";
import { PackageIssuesComponent } from "./components/package-issues/package-issues.component";
import { PackageIssuesDetailComponent } from "./components/package-issues/package-issues-detail/package-issues-detail.component";
import { CreatePackageIssueComponent } from "./components/package-issues/create-package-issue/create-package-issue.component";
import { EditPackageMarkdownComponent } from "./components/edit-package-markdown/edit-package-markdown.component";
import { FollowersComponent } from "../shared/followers/followers.component";

const routes: Routes = [
    {
        path: "",
        component: PackageComponent,
        children: [
            {
                path: "",
                component: PackageDescriptionComponent,
                pathMatch: "full"
            },
            {
                path: "readme",
                component: EditPackageMarkdownComponent
            },
            {
                path: "license",
                component: EditPackageMarkdownComponent
            },
            {
                path: "issues",
                component: PackageIssuesComponent
            },
            {
                path: "issues/new",
                component: CreatePackageIssueComponent
            },
            {
                path: "issues/:issueNumber",
                component: PackageIssuesDetailComponent
            },
            {
                path: "history",
                component: PackageVersionComponent
            },
            {
                path: "manage",
                component: PackagePermissionComponent
            },
            {
                path: "followers",
                component: FollowersComponent
            },
            {
                path: "**",
                redirectTo: "description"
            }
        ]
    },
    {
        path: "delete-confirmation",
        component: PackageDeletionConfirmationComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PackageRoutingModule {}
