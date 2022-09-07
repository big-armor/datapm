import { Component, EventEmitter, Input, Output, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AuthenticationService } from "src/app/services/authentication.service";
import { CurrentUser, User } from "src/generated/graphql";

@Component({
    selector: "app-user-item",
    templateUrl: "./user-item.component.html",
    styleUrls: ["./user-item.component.scss"]
})
export class UserItemComponent implements OnInit {
    private readonly DESCRIPTION_CHARACTER_COUNT_LIMIT = 220;

    @Input()
    public item: User;

    @Input()
    public hasImage: boolean;

    @Input()
    public actionButtonText: string = "";

    @Input()
    public shouldShowActionButton: boolean = false;

    @Output()
    public action = new EventEmitter();

    public currentUser: CurrentUser;

    constructor(private router: Router, private authenticationService: AuthenticationService) {}

    public ngOnInit(): void {
        this.authenticationService.currentUser.subscribe((user) => (this.currentUser = user));
    }

    public goToComponent(): void {
        setTimeout(() => (document.body.scrollTop = 0), 100);

        this.router.navigate([this.item.username]);
    }

    public handleAction(ev): void {
        ev.stopPropagation();
        this.action.emit();
    }
}
