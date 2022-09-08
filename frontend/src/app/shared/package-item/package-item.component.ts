import { Component, EventEmitter, Input, Output, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AuthenticationService } from "src/app/services/authentication.service";
import { CurrentUser, Package, User } from "src/generated/graphql";
import * as timeago from "timeago.js";

@Component({
    selector: "app-package-item",
    templateUrl: "./package-item.component.html",
    styleUrls: ["./package-item.component.scss"]
})
export class PackageItemComponent implements OnInit {
    private readonly DESCRIPTION_CHARACTER_COUNT_LIMIT = 220;

    @Input()
    public item: Package;

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
        const { catalogSlug, packageSlug } = this.item.identifier;
        setTimeout(() => (document.body.scrollTop = 0), 100);

        this.router.navigate([catalogSlug, packageSlug]);
    }

    public handleAction(ev): void {
        ev.stopPropagation();
        this.action.emit();
    }

    public get lastActivityLabel(): string {
        return timeago.format(this.item.updatedAt);
    }

    public get truncatedDescription(): string {
        if (!this.item.description) {
            return "";
        }

        if (this.item.description.length > this.DESCRIPTION_CHARACTER_COUNT_LIMIT) {
            return this.item.description.substr(0, this.DESCRIPTION_CHARACTER_COUNT_LIMIT) + "...";
        }
        return this.item.description;
    }
}
