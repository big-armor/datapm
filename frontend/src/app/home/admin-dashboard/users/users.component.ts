import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, ViewChild } from "@angular/core";
import { MatPaginator } from "@angular/material/paginator";
import {
    AdminSetUserStatusGQL,
    AdminDeleteUserGQL,
    AdminSearchUsersGQL,
    User,
    SetAsAdminGQL
} from "../../../../generated/graphql";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import Timeout = NodeJS.Timeout;
import { ConfirmationDialogService } from "../../../services/dialog/confirmation-dialog.service";
import { UserStatusChangeDialogResponse } from "src/app/services/dialog/user-status-change-dialog-response";
import { DialogSize } from "src/app/services/dialog/dialog-size";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { MatDialog } from "@angular/material/dialog";
import { AdminStatusConfirmationComponent } from "./admin-status-confirmation/admin-status-confirmation.component";

@Component({
    selector: "app-users",
    templateUrl: "./users.component.html",
    styleUrls: ["./users.component.scss"]
})
export class UsersComponent implements AfterViewInit, OnDestroy {
    public readonly DISPLAYED_COLUMNS: string[] = ["username", "name", "emailAddress", "isAdmin", "actions"];
    public readonly USERS_PER_PAGE = 10;

    private readonly destroyed = new Subject();

    disabled = false;

    @ViewChild(MatPaginator)
    public paginator: MatPaginator;

    public loading: boolean = false;
    public searchValue: string = "";

    public totalMatchingUsers: number = 0;
    public displayedUsers: User[] = [];

    private loadedUsersCount: number = 0;
    private usersByPageIndex: Map<number, User[]> = new Map();

    private searchTimeout: Timeout;

    constructor(
        private searchUsersGQL: AdminSearchUsersGQL,
        private changeUserStatusGQL: AdminSetUserStatusGQL,
        private deleteUserGQL: AdminDeleteUserGQL,
        private dialog: MatDialog,
        private changeDetectorRef: ChangeDetectorRef,
        private confirmationDialogService: ConfirmationDialogService
    ) {}

    public ngAfterViewInit(): void {
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

    public updateAdmin(changeEvent: MatSlideToggleChange, user: User): void {
        this.dialog
            .open(AdminStatusConfirmationComponent, {
                width: "500px",
                disableClose: true,
                data: {
                    isAdmin: changeEvent.checked,
                    username: user.username
                }
            })
            .afterClosed()
            .subscribe((confirmed) => {
                if (!confirmed) {
                    changeEvent.source.writeValue(!changeEvent.checked);
                }
            });
    }

    public openDeleteUserConfirmationDialog(user: User): void {
        const dialogContent = `<p class="mb-1">Are you sure you want to delete user ${user.username}</p>
          <p class="mb-0">This will completely delete this user's data and it will be lost forever.</p>`;
        const dialogConfig = {
            data: {
                title: "Confirm user deletion",
                content: dialogContent,
                showConfirmationInputField: true,
                confirmationInputFieldRequiredValue: user.username
            },
            size: DialogSize.MEDIUM
        };
        this.confirmationDialogService.openFancyConfirmationDialog(dialogConfig).subscribe((confirmation) => {
            if (confirmation) {
                const usernameOrEmailAddress = user.emailAddress ? user.emailAddress : user.username;
                this.deleteUserGQL.mutate({ usernameOrEmailAddress }).subscribe(() => this.loadSearchedUsers());
            }
        });
    }

    public openUserStatusChangeConfirmationDialog(user: User): void {
        this.confirmationDialogService
            .openUserStatusChangeConfirmationDialog({ data: user, size: DialogSize.MEDIUM })
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
        if (this.usersByPageIndex.has(this.paginator.pageIndex)) {
            this.displayedUsers = this.usersByPageIndex.get(this.paginator.pageIndex);
            return;
        }

        this.loading = true;
        this.searchUsersGQL
            .fetch({ value: this.searchValue, offset: this.loadedUsersCount, limit: this.USERS_PER_PAGE })
            .subscribe(
                (users) => {
                    const response = users.data?.adminSearchUsers;
                    if (response) {
                        this.loadUsersToTheTable(response.users as User[], response.count);
                    } else {
                        this.resetLoadedUsersData();
                    }
                    this.loading = false;
                },
                () => this.resetLoadedUsersData()
            );
    }

    private loadUsersToTheTable(users: User[], totalCount: number): void {
        this.usersByPageIndex.set(this.paginator.pageIndex, users);
        this.displayedUsers = users;
        this.loadedUsersCount += users.length;
        setTimeout(() => (this.paginator.length = totalCount));
    }

    private resetLoadedUsersData(): void {
        this.totalMatchingUsers = 0;
        this.loadedUsersCount = 0;
        this.usersByPageIndex = new Map();
        this.paginator.pageIndex = 0;
    }
}
