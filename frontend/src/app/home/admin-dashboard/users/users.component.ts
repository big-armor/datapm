import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, ViewChild } from "@angular/core";
import { MatPaginator } from "@angular/material/paginator";
import { MatTableDataSource } from "@angular/material/table";
import {
    AdminSetUserStatusGQL,
    AdminDeleteUserGQL,
    AdminSearchUsersGQL,
    User,
    CreatePackageIssueGQL,
    CreatePackageIssueCommentGQL,
    PackageIssuesGQL,
    OrderBy,
    PackageIssueCommentsGQL
} from "../../../../generated/graphql";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import Timeout = NodeJS.Timeout;
import { ConfirmationDialogService } from "../../../services/dialog/confirmation-dialog.service";
import { UserStatusChangeDialogResponse } from "src/app/services/dialog/user-status-change-dialog-response";

@Component({
    selector: "app-users",
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"]
})
export class UsersComponent implements AfterViewInit, OnDestroy {
    public readonly DISPLAYED_COLUMNS: string[] = [
        "username",
        "firstName",
        "lastName",
        "emailAddress",
        "isAdmin",
        "actions"
    ];
    public readonly USERS_PER_PAGE = 20;

    public readonly dataSource = new MatTableDataSource<User>();
    private readonly destroyed = new Subject();

    @ViewChild(MatPaginator)
    public paginator: MatPaginator;

    public loading: boolean = false;
    public searchValue: string = "";

    public loadedPages: number[] = [];
    public loadedUsers: User[] = [];
    public totalMatchingUsers: number = 0;

    private searchTimeout: Timeout;

    constructor(
        private packageIssueComments: PackageIssueCommentsGQL,
        private packageIssues: PackageIssuesGQL,
        private createPackageIssue: CreatePackageIssueGQL,
        private createPackageIssueComment: CreatePackageIssueCommentGQL,
        private searchUsersGQL: AdminSearchUsersGQL,
        private changeUserStatusGQL: AdminSetUserStatusGQL,
        private deleteUserGQL: AdminDeleteUserGQL,
        private changeDetectorRef: ChangeDetectorRef,
        private confirmationDialogService: ConfirmationDialogService
    ) {}

    public ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.subscribeToPageChangeEvent();
        this.loadUsers();
        this.changeDetectorRef.detectChanges();
    }

    public ngOnDestroy(): void {
        this.destroyed.next();
        this.destroyed.complete();
    }

    public searchUsers(): void {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(() => this.loadSearchedUsers(), 300);
    }

    public clearUserSearch(): void {
        this.searchValue = "";
        this.searchUsers();
    }

    public openDeleteUserConfirmationDialog(user: User): void {
        this.getx();
        //     const dialogContent = `<p>Are you sure you want to delete user ${user.username}</p>
        //   <p>This will completely delete this user's data and it will be lost forever.</p>`;
        //     const dialogConfig = {
        //         data: {
        //             title: "Confirm user deletion",
        //             content: dialogContent,
        //             showConfirmationInputField: true,
        //             confirmationInputFieldRequiredValue: user.username
        //         }
        //     };
        //     this.confirmationDialogService.openFancyConfirmationDialog(dialogConfig).subscribe((confirmation) => {
        //         if (confirmation) {
        //             const usernameOrEmailAddress = user.emailAddress ? user.emailAddress : user.username;
        //             this.deleteUserGQL.mutate({ usernameOrEmailAddress }).subscribe(() => this.loadSearchedUsers());
        //         }
        //     });
    }

    public getx(): void {
        this.packageIssueComments
            .fetch({
                issueIdentifier: {
                    issueId: 1,
                    package: {
                        catalogSlug: "ermali",
                        packageSlug: "air-data"
                    }
                },
                limit: 10,
                offset: 0,
                orderBy: OrderBy.CREATED_AT
            })
            .subscribe((result) => {
                console.log("result", result);
            });
    }

    public getzzz(): void {
        this.packageIssues
            .fetch({
                packageIdentifier: {
                    catalogSlug: "ermali",
                    packageSlug: "air-data"
                },
                limit: 10,
                offset: 0,
                orderBy: OrderBy.CREATED_AT
            })
            .subscribe((result) => {
                console.log("result", result);
            });
    }

    public create(): void {
        this.createPackageIssue
            .mutate({
                packageIdentifier: {
                    catalogSlug: "ermali",
                    packageSlug: "air-data"
                },
                issue: {
                    subject: "Bad package",
                    content: "This package sucks"
                }
            })
            .subscribe((result) => {
                console.log("result", result);
            });
    }

    public create2(): void {
        this.createPackageIssueComment
            .mutate({
                identifier: {
                    issueId: 1,
                    package: {
                        catalogSlug: "ermali",
                        packageSlug: "air-data"
                    }
                },
                comment: {
                    content: "Stupid package"
                }
            })
            .subscribe((result) => {
                console.log("result", result);
            });
    }

    public openUserStatusChangeConfirmationDialog(user: User): void {
        this.confirmationDialogService
            .openUserStatusChangeConfirmationDialog({ data: user })
            .subscribe((response: UserStatusChangeDialogResponse) => {
                if (response) {
                    this.changeUserStatusGQL
                        .mutate({ username: user.username, status: response.status, message: response.message })
                        .subscribe(() => this.loadSearchedUsers());
                }
            });
    }

    private subscribeToPageChangeEvent(): void {
        this.paginator.page.pipe(takeUntil(this.destroyed)).subscribe(() => this.loadUsers());
    }

    private loadSearchedUsers(): void {
        this.resetLoadedUsersData();
        this.loadUsers();
    }

    private loadUsers(): void {
        if (this.loadedPages.includes(this.paginator.pageIndex)) {
            return;
        }

        this.loading = true;
        this.searchUsersGQL
            .fetch({ value: this.searchValue, offset: this.loadedUsers.length, limit: this.USERS_PER_PAGE })
            .subscribe(
                (users) => {
                    const response = users.data?.adminSearchUsers;
                    if (response) {
                        this.loadUsersToTheTable(response.users as User[], response.count);
                    } else {
                        this.resetLoadedUsersData();
                    }
                },
                () => this.resetLoadedUsersData(),
                () => setTimeout(() => (this.loading = false), 500)
            );
    }

    private loadUsersToTheTable(users: User[], totalCount: number): void {
        this.loadedPages.push(this.paginator.pageIndex);
        this.loadedUsers.push(...users);
        this.dataSource.data = this.loadedUsers;
        setTimeout(() => (this.paginator.length = totalCount));
    }

    private resetLoadedUsersData(): void {
        this.loadedUsers = [];
        this.loadedPages = [];
        this.totalMatchingUsers = 0;
        this.dataSource.data = [];
    }
}
