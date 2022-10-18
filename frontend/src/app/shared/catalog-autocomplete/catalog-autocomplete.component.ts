import { Component, Input, OnInit } from "@angular/core";
import { FormControl } from "@angular/forms";
import { debounceTime, switchMap } from "rxjs/operators";
import { AutoCompleteCatalogGQL, AutoCompleteResult } from "src/generated/graphql";

@Component({
    selector: "app-catalog-autocomplete",
    templateUrl: "./catalog-autocomplete.component.html",
    styleUrls: ["./catalog-autocomplete.component.scss"]
})
export class CatalogAutocompleteComponent implements OnInit {
    constructor(private autoCompleteCatalogs: AutoCompleteCatalogGQL) {}

    @Input()
    public form: FormControl;

    public autoCompleteResult: AutoCompleteResult;

    public catalogKeyDownHasHappened = false;

    ngOnInit(): void {
        this.form.valueChanges.subscribe((value) => {
            value.catalogSlug = value.catalogSlug?.replace(/ /g, "-");
        });

        this.form.valueChanges
            .pipe(
                debounceTime(500),
                switchMap((value) => {
                    if (value.catalogSlug == null || value.catalogSlug.length < 2) {
                        this.autoCompleteResult = null;
                        return [];
                    }
                    return this.autoCompleteCatalogs.fetch({ startsWith: value.catalogSlug });
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

    public catalogInputKeyDown(): void {
        this.catalogKeyDownHasHappened = true;
    }
}
