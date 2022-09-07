import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormControl } from "@angular/forms";
import { debounceTime, switchMap } from "rxjs/operators";
import { AutoCompletePackageGQL, AutoCompleteResult, Package } from "src/generated/graphql";

@Component({
    selector: "app-package-autocomplete",
    templateUrl: "./package-autocomplete.component.html",
    styleUrls: ["./package-autocomplete.component.scss"]
})
export class PackageAutocompleteComponent implements OnInit {
    constructor(private autoCompletePackages: AutoCompletePackageGQL) {}

    @Input()
    public form: FormControl;

    public autoCompleteResult: AutoCompleteResult;

    public packageKeyDownHasHappened = false;

    ngOnInit(): void {
        this.form.valueChanges.subscribe((value) => {
            value.packageSlug = value.packageSlug?.replace(/ /g, "-");
        });

        this.form.valueChanges
            .pipe(
                debounceTime(500),
                switchMap((value) => {
                    if (value.packageSlug.length < 2) {
                        this.autoCompleteResult = null;
                        return [];
                    }
                    return this.autoCompletePackages.fetch({ startsWith: value.packageSlug });
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

    public packageInputKeyDown(): void {
        this.packageKeyDownHasHappened = true;
    }
}
