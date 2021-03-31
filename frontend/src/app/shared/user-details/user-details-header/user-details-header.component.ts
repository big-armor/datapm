import { Component, Input, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Subscription } from "rxjs";
import { AuthenticationService } from "src/app/services/authentication.service";
import { User } from "src/generated/graphql";
import { FollowDialogComponent } from "../../dialogs/follow-dialog/follow-dialog.component";

@Component({
    selector: "app-user-details-header",
    templateUrl: "./user-details-header.component.html",
    styleUrls: ["./user-details-header.component.scss"]
})
export class UserDetailsHeaderComponent implements OnInit {
    @Input() user: User;
    private currentUser: User;
    private subscription: Subscription;

    constructor(private authService: AuthenticationService, public dialog: MatDialog) {
        this.subscription = this.authService.currentUser.subscribe((user: User) => {
            this.currentUser = user;
        });
    }

    ngOnInit(): void {}

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    public get isCurrentUser() {
        return this.user && this.currentUser?.username === this.user.username;
    }

    public createFollow() {
        const dlgRef = this.dialog.open(FollowDialogComponent, {
            width: "500px"
        });
    }
}
