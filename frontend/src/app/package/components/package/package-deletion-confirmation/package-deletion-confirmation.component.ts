import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { DeletePackageGQL } from "../../../../../generated/graphql";

@Component({
    selector: "app-package-deletion-confirmation",
    templateUrl: "./package-deletion-confirmation.component.html",
    styleUrls: ["./package-deletion-confirmation.component.scss"]
})
export class PackageDeletionConfirmationComponent implements OnInit {
    private readonly COUNTDOWN_VALUE = 5;
    private readonly INITIAL_FREEZE_TIME_VALUE = 1000;

    public catalogSlug: string;
    public packageSlug: string;

    public currentCountdownValue = this.COUNTDOWN_VALUE;
    public isCountdownOver: boolean = false;

    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private deletePackageGQL: DeletePackageGQL
    ) {
        this.catalogSlug = activatedRoute.snapshot.params.catalogSlug;
        this.packageSlug = activatedRoute.snapshot.params.packageSlug;
    }

    public ngOnInit(): void {
        this.startCountdown();
    }

    public cancel(): void {
        this.router.navigate([this.catalogSlug, this.packageSlug]);
    }

    public deletePackage(): void {
        this.deletePackageGQL
            .mutate({
                identifier: {
                    catalogSlug: this.catalogSlug,
                    packageSlug: this.packageSlug
                }
            })
            .subscribe((response) => {
                if (!response.errors) {
                    this.router.navigate([this.catalogSlug]);
                }
            });
    }

    private startCountdown(): void {
        setTimeout(() => this.countDown(), this.INITIAL_FREEZE_TIME_VALUE);
    }

    private countDown(): void {
        if (this.currentCountdownValue === 0) {
            this.isCountdownOver = true;
            return;
        }

        this.currentCountdownValue -= 1;
        setTimeout(() => this.countDown(), 1000);
    }
}
