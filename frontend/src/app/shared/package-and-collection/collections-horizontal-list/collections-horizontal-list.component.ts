import { Component, Input, OnChanges } from "@angular/core";
import { Router } from "@angular/router";
import { Collection } from "src/generated/graphql";

@Component({
    selector: "app-collections-horizontal-list",
    templateUrl: "./collections-horizontal-list.component.html",
    styleUrls: ["./collections-horizontal-list.component.scss"]
})
export class CollectionsHorizontalListComponent implements OnChanges {
    @Input()
    public collections: Collection[] = [];

    public rowsWithCollections = [];

    private readonly COLLECTIONS_PER_ROW_COUNT = 15;
    private readonly MAXIMUM_ROWS_COUNT = 3;

    public constructor(private router: Router) {}

    slideConfig = {
        slidesToShow: 3,
        slidesToScroll: 1,
        rows: 2,
        draggable: true,
        focusOnSelect: true,
        infinite: false,
        touchMove: true,
        responsive: [
            {
                breakpoint: 767,
                settings: {
                    slidesToShow: 2
                }
            },
            {
                breakpoint: 567,
                settings: {
                    slidesToShow: 1
                }
            }
        ]
    };

    public ngOnChanges(): void {
        this.createGridSystem();
    }

    public goToCollection(collectionSlug: string): void {
        this.router.navigate(["collection/" + collectionSlug]);
    }

    private createGridSystem(): void {
        if (this.collections.length < this.COLLECTIONS_PER_ROW_COUNT + this.COLLECTIONS_PER_ROW_COUNT / 2) {
            this.rowsWithCollections = [this.collections];
            return;
        }

        const rowsCount = this.countRowsToBeUsed();
        const collectionsPerRow = Math.ceil(this.collections.length / rowsCount);
        this.rowsWithCollections = this.initializeRowsArrays(rowsCount);
        for (let i = 0; i < rowsCount; i++) {
            this.rowsWithCollections[i] = this.collections.slice(i * collectionsPerRow, (i + 1) * collectionsPerRow);
        }
    }

    private countRowsToBeUsed(): number {
        const rowsCount = Math.ceil(this.collections.length / this.COLLECTIONS_PER_ROW_COUNT);
        return Math.min(rowsCount, this.MAXIMUM_ROWS_COUNT);
    }

    private initializeRowsArrays(rowsCount: number): Collection[][] {
        let rows: Collection[][] = [];

        for (let i = 0; i < rowsCount; i++) {
            rows[i] = [];
        }

        return rows;
    }

    // TODO: DELETE AFTER THE UI IMPROVEMENTS DONE
    // constructor() {
    //   this.test();
    //   this.createGridSystem();
    // }
    // private test() {
    //   this.collections = [];
    //   for (let i = 0; i < 10; i++) {
    //     this.collections.push({
    //       name: "Col: " + i,
    //       identifier: {
    //         collectionSlug: "Col" + i
    //       }
    //     })
    //   }
    // }
}
