import { Component, Input, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { debounceTime, switchMap } from "rxjs/operators";
import { AutoCompleteCollectionGQL, AutoCompleteResult } from "src/generated/graphql";

@Component({
    selector: "app-collection-autocomplete",
    templateUrl: "./collection-autocomplete.component.html",
    styleUrls: ["./collection-autocomplete.component.scss"]
})
export class CollectionAutocompleteComponent implements OnInit {
    constructor(private autoCompleteCollections: AutoCompleteCollectionGQL) {}

    @Input()
    public form: FormControl;

    public autoCompleteResult: AutoCompleteResult;

    public collectionKeyDownHasHappened = false;

    ngOnInit(): void {
        this.form.valueChanges.subscribe((value) => {
            value.collectionSlug = value.collectionSlug?.replace(/ /g, "-");
        });

        this.form.valueChanges
            .pipe(
                debounceTime(500),
                switchMap((value) => {
                    if (value.collectionSlug.length < 2) {
                        this.autoCompleteResult = null;
                        return [];
                    }
                    return this.autoCompleteCollections.fetch({ startsWith: value.collectionSlug });
                })
            )
            .subscribe((result) => {
                if (result.errors != null) {
                    this.autoCompleteResult = null;
                    return;
                } else {
                    this.autoCompleteResult = result.data.autoComplete;
                }
            });
    }

    public collectionInputKeyDown(): void {
        this.collectionKeyDownHasHappened = true;
    }
}
