import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { PageState } from "src/app/models/page-state";
import {
    ActivityLogChangeType,
    DeleteFollowGQL,
    Follow,
    FollowIdentifierInput,
    NotificationFrequency,
    SaveFollowGQL
} from "src/generated/graphql";

export interface FollowDialogData {
    follow: Follow;
    followIdentifier: FollowIdentifierInput;
}

export interface FollowDialogResult {
    follow: Follow;
    type: FollowDialogResultType;
}

export enum FollowDialogResultType {
    FOLLOW_DELETED,
    FOLLOW_UPDATED
}

interface PackageChangeType {
    label: string;
    changeType: ActivityLogChangeType;
}

@Component({
    selector: "app-follow-dialog",
    templateUrl: "./follow-dialog.component.html",
    styleUrls: ["./follow-dialog.component.scss"]
})
export class FollowDialogComponent {
    public readonly frequencies: NotificationFrequency[] = Object.values(NotificationFrequency);
    public readonly PACKAGE_CHANGE_TYPES = this.buildPackageChangeTypeOptions();

    public submitState: PageState = "INIT";

    public follow: Follow;
    public isFollowing = false;
    public selectedFrequency: NotificationFrequency = NotificationFrequency.WEEKLY;

    public followAllPackages: boolean = true;
    public followAllPackageIssues: boolean = false;
    public selectedChangeType: PackageChangeType = this.getDefaultChangeType();

    private followIdentifier: FollowIdentifierInput;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: FollowDialogData,
        private dialogRef: MatDialogRef<FollowDialogComponent>,
        private saveFollowGQL: SaveFollowGQL,
        private deleteFollowGQL: DeleteFollowGQL
    ) {
        if (data) {
            this.follow = Object.assign({}, data.follow);
            if (data.follow) {
                this.isFollowing = true;
                this.selectedFrequency = data.follow.notificationFrequency;
                this.followAllPackages = data.follow.followAllPackages;
                this.followAllPackageIssues = data.follow.followAllPackageIssues;
                if (data.follow.changeType) {
                    this.selectedChangeType = this.PACKAGE_CHANGE_TYPES.find((c) => data.follow.changeType.includes(c.changeType));
                } else {
                    this.selectedChangeType = this.getDefaultChangeType();
                }
            }
            this.followIdentifier = data.followIdentifier;
        }
    }

    public canFollowAllPackages(): boolean {
        return this.followIdentifier.catalog != null || this.followIdentifier.collection != null;
    }

    public canFollowPackageContent(): boolean {
        return this.canFollowAllPackages() || this.followIdentifier.package != null;
    }

    public save(): void {
        if (!this.follow) {
            this.follow = {} as Follow;
        }

        this.follow.notificationFrequency = this.selectedFrequency;
        this.follow.followAllPackages = this.followAllPackages;
        this.follow.followAllPackageIssues = this.followAllPackageIssues;
        this.follow.changeType = this.getChangeTypesForSelectedPackageChangeType();
        this.saveFollow();
    }

    public cancel(): void {
        this.close();
    }

    public deleteFollow(): void {
        this.deleteFollowGQL
            .mutate({
                follow: this.followIdentifier
            })
            .subscribe(() => this.closeWithValues(null, FollowDialogResultType.FOLLOW_DELETED));
    }

    private getDefaultChangeType(): PackageChangeType {
        return this.PACKAGE_CHANGE_TYPES[2];
    }

    private getChangeTypesForSelectedPackageChangeType(): ActivityLogChangeType[] {
        switch (this.selectedChangeType.changeType) {
            case ActivityLogChangeType.VERSION_MAJOR_CHANGE:
                return [ActivityLogChangeType.VERSION_MAJOR_CHANGE];
            case ActivityLogChangeType.VERSION_MINOR_CHANGE:
                return [ActivityLogChangeType.VERSION_MINOR_CHANGE, ActivityLogChangeType.VERSION_MAJOR_CHANGE];
            case ActivityLogChangeType.VERSION_PATCH_CHANGE:
                return [ActivityLogChangeType.VERSION_PATCH_CHANGE, ActivityLogChangeType.VERSION_MINOR_CHANGE, ActivityLogChangeType.VERSION_MAJOR_CHANGE];
            default:
                return [];
        }
    }

    private saveFollow(): void {
        this.saveFollowGQL
            .mutate({
                follow: {
                    ...this.followIdentifier,
                    notificationFrequency: this.selectedFrequency,
                    followAllPackages: this.followAllPackages,
                    followAllPackageIssues: this.followAllPackageIssues,
                    changeType: this.follow.changeType
                }
            })
            .subscribe(
                ({ data, errors }) => {
                    if (errors) {
                        this.submitState = "ERROR";
                        console.error(errors);
                        return;
                    }
                    this.closeWithValues(this.follow, FollowDialogResultType.FOLLOW_UPDATED);
                },
                (error) => {
                    console.log(error);
                }
            );
    }

    private closeWithValues(follow: Follow, type: FollowDialogResultType): void {
        const result = this.buildResult(follow, type);
        this.close(result);
    }

    private buildResult(follow: Follow, type: FollowDialogResultType): FollowDialogResult {
        return { follow, type };
    }

    private close(result?: FollowDialogResult): void {
        this.dialogRef.close(result);
    }

    private buildPackageChangeTypeOptions(): PackageChangeType[] {
        return [
            {
                label: "Breaking",
                changeType: ActivityLogChangeType.VERSION_MAJOR_CHANGE
            },
            {
                label: "Adaptive",
                changeType: ActivityLogChangeType.VERSION_MINOR_CHANGE
            },
            {
                label: "Descriptive",
                changeType: ActivityLogChangeType.VERSION_PATCH_CHANGE
            }
        ];
    }
}
