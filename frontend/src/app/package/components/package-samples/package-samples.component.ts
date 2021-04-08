import { Component, Input, OnChanges, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { Schema } from "datapm-lib";
import { Subject } from "rxjs";
import { Package } from "src/generated/graphql";
import { SamplesFullScreenDialog } from "./samples-fullscreen-dialog.component";

type State = "NO_SAMPLES" | "LOADING" | "LOADED";

@Component({
    selector: "samples",
    templateUrl: "./package-samples.component.html",
    styleUrls: ["./package-samples.component.scss"]
})
export class PackageSamplesComponent implements OnChanges, OnDestroy {
    private readonly unsubscribe$ = new Subject();

    @Input()
    public package: Package;

    @Input()
    public schema: Schema;

    public state: State = "LOADING";
    public valuesToDisplay: { [key: string]: string }[];

    constructor(private dialog: MatDialog) {}

    public ngOnChanges(): void {
        this.state = "LOADING";
        if (!this.schema || this.schema.sampleRecords == null || this.schema.sampleRecords.length == 0) {
            this.state = "NO_SAMPLES";
            return;
        }

        this.state = "LOADED";
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public showSchemaFullScreen(schema: Schema) {
        this.dialog.open(SamplesFullScreenDialog, {
            width: "100%",
            height: "100%",
            panelClass: "my-second-custom-dialog",
            maxWidth: "100%",
            maxHeight: "100%",
            data: {
                schema,
                package: this.package
            }
        });
    }
}
