import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, ViewChild } from "@angular/core";
import { MatPaginator } from "@angular/material/paginator";
import { AdminSearchGroupsGQL, User, Group, DeleteGroupGQL } from "../../../../generated/graphql";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import Timeout = NodeJS.Timeout;
import { ConfirmationDialogService } from "../../../services/dialog/confirmation-dialog.service";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { MatDialog } from "@angular/material/dialog";
import { GroupAdminConfirmationComponent } from "./admin-status-confirmation/admin-status-confirmation.component";
import { DialogSize } from "../../../services/dialog/dialog-size";
import { CreateGroupComponent, CreateGroupResult } from "src/app/shared/create-group/create-group.component";
import { Router } from "@angular/router";

@Component({
    selector: "app-groups",
    templateUrl: "./groups.component.html",
    styleUrls: ["./groups.component.scss"]
})
export class GroupsComponent implements AfterViewInit, OnDestroy {
    public readonly DISPLAYED_COLUMNS: string[] = ["name", "isAdmin", "actions"];
    public readonly GROUPS_PER_PAGE = 10;

    private readonly destroyed = new Subject();

    disabled = false;

    @ViewChild(MatPaginator)
    public paginator: MatPaginator;

    public loading: boolean = false;
    public searchValue: string = "";

    public totalMatchingGroups: number = 0;
    public displayedGroups: Group[] = [];

    private loadedGroupsCount: number = 0;
    private groupsByPageIndex: Map<number, Group[]> = new Map();

    private searchTimeout: Timeout;

    constructor(
        private searchGroupsGQL: AdminSearchGroupsGQL,
        private deleteGroupGQL: DeleteGroupGQL,
        private dialog: MatDialog,
        private router: Router,
        private changeDetectorRef: ChangeDetectorRef,
        private confirmationDialogService: ConfirmationDialogService
    ) {}

    public ngAfterViewInit(): void {
        this.subscribeToPageChangeEvent();
        this.loadGroups();
        this.changeDetectorRef.detectChanges();
    }

    public ngOnDestroy(): void {
        this.destroyed.next();
        this.destroyed.complete();
    }

    public searchGroups(): void {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => this.loadSearchedGroups(), 300);
    }

    public clearGroupSearch(): void {
        this.searchValue = "";
        this.searchGroups();
    }

    public createGroup(): void {
        this.dialog
            .open(CreateGroupComponent)
            .afterClosed()
            .subscribe((data: CreateGroupResult) => {
                if (data) {
                    this.router.navigate(["group", data.groupSlug]);
                }
            });
    }

    public updateAdmin(changeEvent: MatSlideToggleChange, group: Group): void {
        this.dialog
            .open(GroupAdminConfirmationComponent, {
                width: "500px",
                disableClose: true,
                data: {
                    isAdmin: changeEvent.checked,
                    group
                }
            })
            .afterClosed()
            .subscribe((confirmed) => {
                if (!confirmed) {
                    changeEvent.source.writeValue(!changeEvent.checked);
                }
            });
    }

    public openDeleteGroupConfirmationDialog(group: Group): void {
        const dialogContent = `<p class="mb-1">Are you sure you want to delete group ${group.name}</p>`;
        const dialogConfig = {
            data: {
                title: "Confirm group deletion",
                content: dialogContent,
                showConfirmationInputField: true,
                confirmationInputFieldRequiredValue: group.name ?? "Unknown"
            },
            size: DialogSize.MEDIUM
        };
        this.confirmationDialogService.openFancyConfirmationDialog(dialogConfig).subscribe((confirmation) => {
            if (confirmation) {
                this.deleteGroupGQL.mutate({ groupSlug: group.slug }).subscribe(() => this.loadSearchedGroups());
            }
        });
    }

    private subscribeToPageChangeEvent(): void {
        this.paginator.page.pipe(takeUntil(this.destroyed)).subscribe(() => this.loadGroups());
    }

    private loadSearchedGroups(): void {
        this.resetLoadedGroupsData();
        this.loadGroups();
    }

    private loadGroups(): void {
        if (this.groupsByPageIndex.has(this.paginator.pageIndex)) {
            this.displayedGroups = this.groupsByPageIndex.get(this.paginator.pageIndex);
            return;
        }

        this.loading = true;
        this.searchGroupsGQL
            .fetch({ value: this.searchValue, offset: this.loadedGroupsCount, limit: this.GROUPS_PER_PAGE })
            .subscribe(
                (groups) => {
                    const response = groups.data?.adminSearchGroups;
                    if (response) {
                        this.loadGroupsToTheTable(response.groups as Group[], response.count);
                    } else {
                        this.resetLoadedGroupsData();
                    }
                    this.loading = false;
                },
                () => this.resetLoadedGroupsData()
            );
    }

    private loadGroupsToTheTable(groups: Group[], totalCount: number): void {
        this.groupsByPageIndex.set(this.paginator.pageIndex, groups);
        this.displayedGroups = groups;
        this.loadedGroupsCount += groups.length;
        setTimeout(() => (this.paginator.length = totalCount));
    }

    private resetLoadedGroupsData(): void {
        this.totalMatchingGroups = 0;
        this.loadedGroupsCount = 0;
        this.groupsByPageIndex = new Map();
        this.paginator.pageIndex = 0;
    }
}
