import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSlideToggleChange } from "@angular/material/slide-toggle";
import { ActivatedRoute, NavigationExtras, ParamMap, Router } from "@angular/router";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { PageState } from "src/app/models/page-state";
import { SharePackageComponent } from "src/app/package/components/package-info/share-package/share-package.component";
import { EditCollectionComponent } from "src/app/shared/edit-collection/edit-collection.component";
import {
    Collection,
    CollectionGQL,
    Package,
    Permission,
    RemovePackageFromCollectionGQL,
    UpdateCollectionGQL
} from "src/generated/graphql";
import { AddPackageComponent } from "../add-package/add-package.component";

type CollectionDetailsPageState = PageState | "NOT_AUTHORIZED" | "NOT_FOUND";

@Component({
    selector: "app-collection-details",
    templateUrl: "./collection-details.component.html",
    styleUrls: ["./collection-details.component.scss"]
})
export class CollectionDetailsComponent implements OnInit, OnDestroy {
    @Input() public package: Package;

    public collectionSlug: string = "";
    public collection: Collection;
    public state: CollectionDetailsPageState = "INIT";
    public currentTab = 0;
    private unsubscribe$: Subject<any> = new Subject();

    private tabs = ["", "Manage"];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private collectionGQL: CollectionGQL,
        private removePackageFromCollectionGQL: RemovePackageFromCollectionGQL,
        private dialog: MatDialog
    ) {
        this.route.paramMap.pipe(takeUntil(this.unsubscribe$)).subscribe((paramMap: ParamMap) => {
            this.collectionSlug = paramMap.get("collectionSlug") || "";
            this.getCollectionDetails();
        });

        this.route.fragment.pipe(takeUntil(this.unsubscribe$)).subscribe((fragment: string) => {
            const index = this.tabs.findIndex((tab) => tab === fragment);
            if (index < 0) {
                this.currentTab = 0;
                this.updateTabParam();
            } else {
                this.updateTabParam();
            }
        });
    }

    ngOnInit(): void {}

    ngOnDestroy() {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public sharePackage() {
        const dialogRef = this.dialog.open(SharePackageComponent, {
            data: this.package,
            width: "450px"
        });
    }

    public updateTabParam() {
        const tab = this.tabs[this.currentTab];
        const extras: NavigationExtras = {
            relativeTo: this.route
        };

        if (tab !== "") {
            extras.fragment = tab;
        }

        this.router.navigate(["."], extras);
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
                ({ errors, data }) => {
                    if (errors) {
                        if (errors.find((e) => e.message.includes("NOT_AUTHORIZED"))) this.state = "NOT_AUTHORIZED";
                        if (errors.find((e) => e.message.includes("COLLECTION_NOT_FOUND"))) this.state = "NOT_FOUND";
                        else this.state = "ERROR";
                        return;
                    }
                    this.collection = data.collection as Collection;
                    console.log(this.collection);
                    this.state = "SUCCESS";
                },
                () => {
                    this.state = "ERROR";
                }
            );
    }

    public collectionEdited(collection: Collection) {
        this.getCollectionDetails();
    }

    public addPackage() {
        const dialogRef = this.dialog.open(AddPackageComponent, {
            data: {
                collectionIdentifier: {
                    collectionSlug: this.collectionSlug
                }
            },
            width: "600px"
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

    editCollection(): void {
        this.dialog
            .open(EditCollectionComponent, {
                data: this.collection
            })
            .afterClosed()
            .subscribe((newCollection: Collection) => {
                this.collection = newCollection;
            });
    }

    public get canManage() {
        return this.collection && this.collection.myPermissions?.includes(Permission.MANAGE);
    }

    public get canEdit() {
        return this.collection && this.collection.myPermissions?.includes(Permission.EDIT);
    }
}
