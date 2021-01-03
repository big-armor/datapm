import { Component, Input, OnDestroy, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { PackageFile, Schema } from "datapm-lib";
import { TableVirtualScrollDataSource } from "ng-table-virtual-scroll";

@Component({
    selector: "app-schema-samples",
    templateUrl: "./samples.component.html",
    styleUrls: ["./samples.component.scss"]
})
export class SamplesComponent implements OnInit, OnDestroy {
    @Input() public schema: Schema;

    public columns: string[];

    dataSource: TableVirtualScrollDataSource<{
        [key: string]: string;
    }>;

    constructor(private dialog: MatDialog) {}

    ngOnInit() {
        this.dataSource = new TableVirtualScrollDataSource(this.schemaSampleValues(this.schema));
        this.columns = Object.keys(this.schema.properties);
    }

    ngOnDestroy() {}

    schemaColumns(schema: Schema) {
        return Object.keys(schema.properties);
    }

    schemaSampleValues(schema: Schema) {
        if (schema == null) return [];

        let index = 0;
        return schema.sampleRecords?.map<{ [key: string]: string }>((r) => {
            const returnValue: { [key: string]: string } = {};
            returnValue._oddEven = index++ % 2 == 0 ? "odd" : "even";

            for (const key of Object.keys(schema.properties)) {
                const value = r[key];
                if (value == null) {
                    returnValue[key] = null;
                    continue;
                }

                if (typeof value === "string") {
                    let shortValue = value;

                    if (value.length > 100) shortValue = value.substr(0, 97) + "...";

                    returnValue[key] = shortValue;
                    continue;
                }
                if (typeof value === "number") {
                    returnValue[key] = (value as number).toString();
                    continue;
                }

                if (typeof value === "boolean") {
                    returnValue[key] = value ? "True" : "False";
                    continue;
                }

                returnValue[key] = value.toString !== undefined ? value.toString() : "";
            }

            return returnValue;
        });
    }
}
