import { Component, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import {
    Collection,
    CollectionGQL,
    Package,
    Permission,
    RemovePackageFromCollectionGQL,
    UpdateCollectionGQL
} from "src/generated/graphql";
import { AddPackageComponent } from "../add-package/add-package.component";

type CollectionDetailsPageState = PageState | "NOT_AUTHORIZED";

@Component({
    selector: "app-collection-details",
    templateUrl: "./collection-details.component.html",
    styleUrls: ["./collection-details.component.scss"]
})
export class CollectionDetailsComponent implements OnInit, OnDestroy {
    public collectionSlug: string = "";
    public collection: Collection;
    public state: CollectionDetailsPageState = "INIT";
    public currentTab = 0;
    private unsubscribe$: Subject<any> = new Subject();

    constructor(
        private route: ActivatedRoute,
        private collectionGQL: CollectionGQL,
        private updateCollectionGQL: UpdateCollectionGQL,
        private removePackageFromCollectionGQL: RemovePackageFromCollectionGQL,
        private dialog: MatDialog
    ) {
        this.route.paramMap.pipe(takeUntil(this.unsubscribe$)).subscribe((paramMap: ParamMap) => {
            this.collectionSlug = paramMap.get("collectionSlug") || "";
            this.getCollectionDetails();
        });
    }

    ngOnInit(): void {}

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    private getCollectionDetails() {
        if (!this.collectionSlug) {
            return;
        }

        this.state = "LOADING";
        this.collectionGQL
            .fetch({
                identifier: {
                    collectionSlug: this.collectionSlug
                }
            })
            .subscribe(
                ({ data }) => {
                    this.collection = data.collection as Collection;
                    console.log(this.collection);
                    this.state = "SUCCESS";
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }

    public addPackage() {
        const dialogRef = this.dialog.open(AddPackageComponent, {
            data: this.collectionSlug
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.getCollectionDetails();
            }
        });
    }

    public removePackage(p: Package) {
        this.removePackageFromCollectionGQL
            .mutate({
                collectionIdentifier: {
                    collectionSlug: this.collectionSlug
                },
                packageIdentifier: {
                    catalogSlug: p.identifier.catalogSlug,
                    packageSlug: p.identifier.packageSlug
                }
            })
            .subscribe(() => {
                this.getCollectionDetails();
            });
    }

    public get canManage() {
        return this.collection && this.collection.myPermissions?.includes(Permission.MANAGE);
    }

    public get canEdit() {
        return this.collection && this.collection.myPermissions?.includes(Permission.EDIT);
    }
}
