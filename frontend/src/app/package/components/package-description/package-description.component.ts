import { Component } from "@angular/core";
import { PackageFile, parsePackageFileJSON, Schema, validatePackageFileInBrowser } from "datapm-lib";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { CollectionBasicData, Package, PackageCollectionsGQL } from "src/generated/graphql";
import { PackageService, PackageResponse } from "../../services/package.service";
@Component({
    selector: "package-description",
    templateUrl: "./package-description.component.html",
    styleUrls: ["./package-description.component.scss"]
})
export class PackageDescriptionComponent {
    private readonly SHOW_MORE_CHARACTER_LIMIT = 300;
    private readonly unsubscribe$ = new Subject();

    public package: Package;
    public packageFile: PackageFile;

    public schemas: any[] = [];
    public selectedSchema: Schema;

    public shouldShowMoreDescriptionButton: boolean;
    public isShowingMoreDescriptionText: boolean;

    public shouldShowMoreLicenseButton: boolean;
    public isShowingMoreLicenseText: boolean;

    public shouldShowMoreReadMeButton: boolean;
    public isShowingMoreReadMeText: boolean;

    public collections: CollectionBasicData[] = [];

    constructor(private packageService: PackageService, private packageCollectionsGQL: PackageCollectionsGQL) {
        this.packageService.package.pipe(takeUntil(this.unsubscribe$)).subscribe((p: PackageResponse) => {
            if (p == null || p.package == null) {
                return;
            }

            this.package = p.package;

            const packageIdentifier = {
                catalogSlug: this.package.identifier.catalogSlug,
                packageSlug: this.package.identifier.packageSlug
            };

            this.packageCollectionsGQL
                .fetch({ packageIdentifier, limit: 10, offset: 0 })
                .subscribe((response) => (this.collections = response.data.packageCollections.collections));

            this.shouldShowMoreDescriptionButton = this.package.description?.length > this.SHOW_MORE_CHARACTER_LIMIT;

            validatePackageFileInBrowser(p.package.latestVersion.packageFile);
            this.packageFile = parsePackageFileJSON(p.package.latestVersion.packageFile);

            this.schemas = this.packageFile.schemas;

            this.shouldShowMoreReadMeButton = this.packageFile.readmeMarkdown?.length > this.SHOW_MORE_CHARACTER_LIMIT;
            this.shouldShowMoreLicenseButton =
                this.packageFile.licenseMarkdown?.length > this.SHOW_MORE_CHARACTER_LIMIT;

            this.initializeSch();
            this.selectedSchema = this.schemas[0];
        });
    }

    public toggleShowMoreDescriptionText() {
        this.isShowingMoreDescriptionText = !this.isShowingMoreDescriptionText;
    }

    public toggleShowMoreReadMeText() {
        this.isShowingMoreReadMeText = !this.isShowingMoreReadMeText;
    }

    public toggleShowMoreLicenseText() {
        this.isShowingMoreLicenseText = !this.isShowingMoreLicenseText;
    }

    public selectSchema(schema: Schema): void {
        this.selectedSchema = schema;
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    initializeSch() {
        this.schemas = [
            {
                $schema: "http://json-schema.org/draft-07/schema",
                $id: "trees",
                properties: {
                    Index: {
                        title: "Index",
                        recordCount: 31,
                        byteCount: 106,
                        valueTypes: {
                            number: {
                                recordCount: 31,
                                valueType: "number",
                                stringOptions: {
                                    "1": 1,
                                    "2": 1,
                                    "3": 1,
                                    "4": 1,
                                    "5": 1,
                                    "6": 1,
                                    "7": 1,
                                    "8": 1,
                                    "9": 1,
                                    "10": 1,
                                    "11": 1,
                                    "12": 1,
                                    "13": 1,
                                    "14": 1,
                                    "15": 1,
                                    "16": 1,
                                    "17": 1,
                                    "18": 1,
                                    "19": 1,
                                    "20": 1,
                                    "21": 1,
                                    "22": 1,
                                    "23": 1,
                                    "24": 1,
                                    "25": 1,
                                    "26": 1,
                                    "27": 1,
                                    "28": 1,
                                    "29": 1,
                                    "30": 1,
                                    "31": 1
                                },
                                numberMaxValue: "9",
                                numberMinValue: "1"
                            }
                        },
                        format: "integer",
                        type: ["number"]
                    },
                    "Girth (in)": {
                        title: "Girth (in)",
                        recordCount: 31,
                        byteCount: 242,
                        valueTypes: {
                            number: {
                                recordCount: 31,
                                valueType: "number",
                                stringOptions: {
                                    "8.3": 1,
                                    "8.6": 1,
                                    "8.8": 1,
                                    "10.5": 1,
                                    "10.7": 1,
                                    "10.8": 1,
                                    "11.0": 2,
                                    "11.1": 1,
                                    "11.2": 1,
                                    "11.3": 1,
                                    "11.4": 2,
                                    "11.7": 1,
                                    "12.0": 1,
                                    "12.9": 2,
                                    "13.3": 1,
                                    "13.7": 1,
                                    "13.8": 1,
                                    "14.0": 1,
                                    "14.2": 1,
                                    "14.5": 1,
                                    "16.0": 1,
                                    "16.3": 1,
                                    "17.3": 1,
                                    "17.5": 1,
                                    "17.9": 1,
                                    "18.0": 2,
                                    "20.6": 1
                                },
                                numberMaxValue: "8.8",
                                numberMinValue: "10.5"
                            }
                        },
                        format: "number,number,number,number,number,number",
                        type: ["number"]
                    },
                    "Height (ft)": {
                        title: "Height (ft)",
                        recordCount: 31,
                        byteCount: 124,
                        valueTypes: {
                            number: {
                                recordCount: 31,
                                valueType: "number",
                                stringOptions: {
                                    "63": 1,
                                    "64": 1,
                                    "65": 1,
                                    "66": 1,
                                    "69": 1,
                                    "70": 1,
                                    "71": 1,
                                    "72": 2,
                                    "74": 2,
                                    "75": 3,
                                    "76": 2,
                                    "77": 1,
                                    "78": 1,
                                    "79": 1,
                                    "80": 5,
                                    "81": 2,
                                    "82": 1,
                                    "83": 1,
                                    "85": 1,
                                    "86": 1,
                                    "87": 1
                                },
                                numberMaxValue: "87",
                                numberMinValue: "63"
                            }
                        },
                        format: "integer",
                        type: ["number"]
                    },
                    "Volume(ft^3)": {
                        title: "Volume(ft^3)",
                        recordCount: 31,
                        byteCount: 248,
                        valueTypes: {
                            number: {
                                recordCount: 31,
                                valueType: "number",
                                stringOptions: {
                                    "10.3": 2,
                                    "10.2": 1,
                                    "16.4": 1,
                                    "18.8": 1,
                                    "19.7": 1,
                                    "15.6": 1,
                                    "18.2": 1,
                                    "22.6": 1,
                                    "19.9": 1,
                                    "24.2": 1,
                                    "21.0": 1,
                                    "21.4": 1,
                                    "21.3": 1,
                                    "19.1": 1,
                                    "22.2": 1,
                                    "33.8": 1,
                                    "27.4": 1,
                                    "25.7": 1,
                                    "24.9": 1,
                                    "34.5": 1,
                                    "31.7": 1,
                                    "36.3": 1,
                                    "38.3": 1,
                                    "42.6": 1,
                                    "55.4": 1,
                                    "55.7": 1,
                                    "58.3": 1,
                                    "51.5": 1,
                                    "51.0": 1,
                                    "77.0": 1
                                },
                                numberMaxValue: "77.0",
                                numberMinValue: "10.2"
                            }
                        },
                        format: "number,number,integer",
                        type: ["number"]
                    }
                },
                recordCount: 31,
                byteCount: 1720,
                type: "object",
                title: "trees",
                sampleRecords: [
                    {
                        Index: 1,
                        "Girth (in)": 8.3,
                        "Height (ft)": 70,
                        "Volume(ft^3)": 10.3
                    },
                    {
                        Index: 2,
                        "Girth (in)": 8.6,
                        "Height (ft)": 65,
                        "Volume(ft^3)": 10.3
                    },
                    {
                        Index: 3,
                        "Girth (in)": 8.8,
                        "Height (ft)": 63,
                        "Volume(ft^3)": 10.2
                    },
                    {
                        Index: 4,
                        "Girth (in)": 10.5,
                        "Height (ft)": 72,
                        "Volume(ft^3)": 16.4
                    },
                    {
                        Index: 5,
                        "Girth (in)": 10.7,
                        "Height (ft)": 81,
                        "Volume(ft^3)": 18.8
                    },
                    {
                        Index: 6,
                        "Girth (in)": 10.8,
                        "Height (ft)": 83,
                        "Volume(ft^3)": 19.7
                    },
                    {
                        Index: 7,
                        "Girth (in)": 11,
                        "Height (ft)": 66,
                        "Volume(ft^3)": 15.6
                    },
                    {
                        Index: 8,
                        "Girth (in)": 11,
                        "Height (ft)": 75,
                        "Volume(ft^3)": 18.2
                    },
                    {
                        Index: 9,
                        "Girth (in)": 11.1,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 22.6
                    },
                    {
                        Index: 10,
                        "Girth (in)": 11.2,
                        "Height (ft)": 75,
                        "Volume(ft^3)": 19.9
                    },
                    {
                        Index: 11,
                        "Girth (in)": 11.3,
                        "Height (ft)": 79,
                        "Volume(ft^3)": 24.2
                    },
                    {
                        Index: 12,
                        "Girth (in)": 11.4,
                        "Height (ft)": 76,
                        "Volume(ft^3)": 21
                    },
                    {
                        Index: 13,
                        "Girth (in)": 11.4,
                        "Height (ft)": 76,
                        "Volume(ft^3)": 21.4
                    },
                    {
                        Index: 14,
                        "Girth (in)": 11.7,
                        "Height (ft)": 69,
                        "Volume(ft^3)": 21.3
                    },
                    {
                        Index: 15,
                        "Girth (in)": 12,
                        "Height (ft)": 75,
                        "Volume(ft^3)": 19.1
                    },
                    {
                        Index: 16,
                        "Girth (in)": 12.9,
                        "Height (ft)": 74,
                        "Volume(ft^3)": 22.2
                    },
                    {
                        Index: 17,
                        "Girth (in)": 12.9,
                        "Height (ft)": 85,
                        "Volume(ft^3)": 33.8
                    },
                    {
                        Index: 18,
                        "Girth (in)": 13.3,
                        "Height (ft)": 86,
                        "Volume(ft^3)": 27.4
                    },
                    {
                        Index: 19,
                        "Girth (in)": 13.7,
                        "Height (ft)": 71,
                        "Volume(ft^3)": 25.7
                    },
                    {
                        Index: 20,
                        "Girth (in)": 13.8,
                        "Height (ft)": 64,
                        "Volume(ft^3)": 24.9
                    },
                    {
                        Index: 21,
                        "Girth (in)": 14,
                        "Height (ft)": 78,
                        "Volume(ft^3)": 34.5
                    },
                    {
                        Index: 22,
                        "Girth (in)": 14.2,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 31.7
                    },
                    {
                        Index: 23,
                        "Girth (in)": 14.5,
                        "Height (ft)": 74,
                        "Volume(ft^3)": 36.3
                    },
                    {
                        Index: 24,
                        "Girth (in)": 16,
                        "Height (ft)": 72,
                        "Volume(ft^3)": 38.3
                    },
                    {
                        Index: 25,
                        "Girth (in)": 16.3,
                        "Height (ft)": 77,
                        "Volume(ft^3)": 42.6
                    },
                    {
                        Index: 26,
                        "Girth (in)": 17.3,
                        "Height (ft)": 81,
                        "Volume(ft^3)": 55.4
                    },
                    {
                        Index: 27,
                        "Girth (in)": 17.5,
                        "Height (ft)": 82,
                        "Volume(ft^3)": 55.7
                    },
                    {
                        Index: 28,
                        "Girth (in)": 17.9,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 58.3
                    },
                    {
                        Index: 29,
                        "Girth (in)": 18,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 51.5
                    },
                    {
                        Index: 30,
                        "Girth (in)": 18,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 51
                    },
                    {
                        Index: 31,
                        "Girth (in)": 20.6,
                        "Height (ft)": 87,
                        "Volume(ft^3)": 77
                    }
                ],
                recordsInspectedCount: 31,
                recordCountPrecision: "EXACT"
            },
            {
                $schema: "http://json-schema.org/draft-07/schema",
                $id: "heheh",
                properties: {
                    Index: {
                        title: "Index",
                        recordCount: 31,
                        byteCount: 106,
                        valueTypes: {
                            number: {
                                recordCount: 31,
                                valueType: "number",
                                stringOptions: {
                                    "1": 1,
                                    "2": 1,
                                    "3": 1,
                                    "4": 1,
                                    "5": 1,
                                    "6": 1,
                                    "7": 1,
                                    "8": 1,
                                    "9": 1,
                                    "10": 1,
                                    "11": 1,
                                    "12": 1,
                                    "13": 1,
                                    "14": 1,
                                    "15": 1,
                                    "16": 1,
                                    "17": 1,
                                    "18": 1,
                                    "19": 1,
                                    "20": 1,
                                    "21": 1,
                                    "22": 1,
                                    "23": 1,
                                    "24": 1,
                                    "25": 1,
                                    "26": 1,
                                    "27": 1,
                                    "28": 1,
                                    "29": 1,
                                    "30": 1,
                                    "31": 1
                                },
                                numberMaxValue: "9",
                                numberMinValue: "1"
                            }
                        },
                        format: "integer",
                        type: ["number"]
                    },
                    "Girth (in)": {
                        title: "Girth (in)",
                        recordCount: 31,
                        byteCount: 242,
                        valueTypes: {
                            number: {
                                recordCount: 31,
                                valueType: "number",
                                stringOptions: {
                                    "8.3": 1,
                                    "8.6": 1,
                                    "8.8": 1,
                                    "10.5": 1,
                                    "10.7": 1,
                                    "10.8": 1,
                                    "11.0": 2,
                                    "11.1": 1,
                                    "11.2": 1,
                                    "11.3": 1,
                                    "11.4": 2,
                                    "11.7": 1,
                                    "12.0": 1,
                                    "12.9": 2,
                                    "13.3": 1,
                                    "13.7": 1,
                                    "13.8": 1,
                                    "14.0": 1,
                                    "14.2": 1,
                                    "14.5": 1,
                                    "16.0": 1,
                                    "16.3": 1,
                                    "17.3": 1,
                                    "17.5": 1,
                                    "17.9": 1,
                                    "18.0": 2,
                                    "20.6": 1
                                },
                                numberMaxValue: "9999",
                                numberMinValue: "10.5"
                            }
                        },
                        format: "number,number,number,number,number,number",
                        type: ["number"]
                    },
                    "Height (ft)": {
                        title: "Height (ft)",
                        recordCount: 31,
                        byteCount: 124,
                        valueTypes: {
                            number: {
                                recordCount: 31,
                                valueType: "number",
                                stringOptions: {
                                    "63": 1,
                                    "64": 1,
                                    "65": 1,
                                    "66": 1,
                                    "69": 1,
                                    "70": 1,
                                    "71": 1,
                                    "72": 2,
                                    "74": 2,
                                    "75": 3,
                                    "76": 2,
                                    "77": 1,
                                    "78": 1,
                                    "79": 1,
                                    "80": 5,
                                    "81": 2,
                                    "82": 1,
                                    "83": 1,
                                    "85": 1,
                                    "86": 1,
                                    "87": 1
                                },
                                numberMaxValue: "87",
                                numberMinValue: "63"
                            }
                        },
                        format: "integer",
                        type: ["number"]
                    },
                    "Volume(ft^3)": {
                        title: "Volume(ft^3)",
                        recordCount: 31,
                        byteCount: 248,
                        valueTypes: {
                            number: {
                                recordCount: 31,
                                valueType: "number",
                                stringOptions: {
                                    "10.3": 2,
                                    "10.2": 1,
                                    "16.4": 1,
                                    "18.8": 1,
                                    "19.7": 1,
                                    "15.6": 1,
                                    "18.2": 1,
                                    "22.6": 1,
                                    "19.9": 1,
                                    "24.2": 1,
                                    "21.0": 1,
                                    "21.4": 1,
                                    "21.3": 1,
                                    "19.1": 1,
                                    "22.2": 1,
                                    "33.8": 1,
                                    "27.4": 1,
                                    "25.7": 1,
                                    "24.9": 1,
                                    "34.5": 1,
                                    "31.7": 1,
                                    "36.3": 1,
                                    "38.3": 1,
                                    "42.6": 1,
                                    "55.4": 1,
                                    "55.7": 1,
                                    "58.3": 1,
                                    "51.5": 1,
                                    "51.0": 1,
                                    "77.0": 1
                                },
                                numberMaxValue: "77.0",
                                numberMinValue: "10.2"
                            }
                        },
                        format: "number,number,integer",
                        type: ["number"]
                    }
                },
                recordCount: 31,
                byteCount: 1720,
                type: "object",
                title: "pemet",
                sampleRecords: [
                    {
                        Index: 1,
                        "Girth (in)": 9999,
                        "Height (ft)": 1233,
                        "Volume(ft^3)": 2122.3
                    },
                    {
                        Index: 2,
                        "Girth (in)": 8.6,
                        "Height (ft)": 65,
                        "Volume(ft^3)": 10.3
                    },
                    {
                        Index: 3,
                        "Girth (in)": 8.8,
                        "Height (ft)": 63,
                        "Volume(ft^3)": 10.2
                    },
                    {
                        Index: 4,
                        "Girth (in)": 10.5,
                        "Height (ft)": 72,
                        "Volume(ft^3)": 16.4
                    },
                    {
                        Index: 5,
                        "Girth (in)": 10.7,
                        "Height (ft)": 81,
                        "Volume(ft^3)": 18.8
                    },
                    {
                        Index: 6,
                        "Girth (in)": 10.8,
                        "Height (ft)": 83,
                        "Volume(ft^3)": 19.7
                    },
                    {
                        Index: 7,
                        "Girth (in)": 11,
                        "Height (ft)": 66,
                        "Volume(ft^3)": 15.6
                    },
                    {
                        Index: 8,
                        "Girth (in)": 11,
                        "Height (ft)": 75,
                        "Volume(ft^3)": 18.2
                    },
                    {
                        Index: 9,
                        "Girth (in)": 11.1,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 22.6
                    },
                    {
                        Index: 10,
                        "Girth (in)": 11.2,
                        "Height (ft)": 75,
                        "Volume(ft^3)": 19.9
                    },
                    {
                        Index: 11,
                        "Girth (in)": 11.3,
                        "Height (ft)": 79,
                        "Volume(ft^3)": 24.2
                    },
                    {
                        Index: 12,
                        "Girth (in)": 11.4,
                        "Height (ft)": 76,
                        "Volume(ft^3)": 21
                    },
                    {
                        Index: 13,
                        "Girth (in)": 11.4,
                        "Height (ft)": 76,
                        "Volume(ft^3)": 21.4
                    },
                    {
                        Index: 14,
                        "Girth (in)": 11.7,
                        "Height (ft)": 69,
                        "Volume(ft^3)": 21.3
                    },
                    {
                        Index: 15,
                        "Girth (in)": 12,
                        "Height (ft)": 75,
                        "Volume(ft^3)": 19.1
                    },
                    {
                        Index: 16,
                        "Girth (in)": 12.9,
                        "Height (ft)": 74,
                        "Volume(ft^3)": 22.2
                    },
                    {
                        Index: 17,
                        "Girth (in)": 12.9,
                        "Height (ft)": 85,
                        "Volume(ft^3)": 33.8
                    },
                    {
                        Index: 18,
                        "Girth (in)": 13.3,
                        "Height (ft)": 86,
                        "Volume(ft^3)": 27.4
                    },
                    {
                        Index: 19,
                        "Girth (in)": 13.7,
                        "Height (ft)": 71,
                        "Volume(ft^3)": 25.7
                    },
                    {
                        Index: 20,
                        "Girth (in)": 13.8,
                        "Height (ft)": 64,
                        "Volume(ft^3)": 24.9
                    },
                    {
                        Index: 21,
                        "Girth (in)": 14,
                        "Height (ft)": 78,
                        "Volume(ft^3)": 34.5
                    },
                    {
                        Index: 22,
                        "Girth (in)": 14.2,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 31.7
                    },
                    {
                        Index: 23,
                        "Girth (in)": 14.5,
                        "Height (ft)": 74,
                        "Volume(ft^3)": 36.3
                    },
                    {
                        Index: 24,
                        "Girth (in)": 16,
                        "Height (ft)": 72,
                        "Volume(ft^3)": 38.3
                    },
                    {
                        Index: 25,
                        "Girth (in)": 16.3,
                        "Height (ft)": 77,
                        "Volume(ft^3)": 42.6
                    },
                    {
                        Index: 26,
                        "Girth (in)": 17.3,
                        "Height (ft)": 81,
                        "Volume(ft^3)": 55.4
                    },
                    {
                        Index: 27,
                        "Girth (in)": 17.5,
                        "Height (ft)": 82,
                        "Volume(ft^3)": 55.7
                    },
                    {
                        Index: 28,
                        "Girth (in)": 17.9,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 58.3
                    },
                    {
                        Index: 29,
                        "Girth (in)": 18,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 51.5
                    },
                    {
                        Index: 30,
                        "Girth (in)": 18,
                        "Height (ft)": 80,
                        "Volume(ft^3)": 51
                    },
                    {
                        Index: 31,
                        "Girth (in)": 20.6,
                        "Height (ft)": 87,
                        "Volume(ft^3)": 77
                    }
                ],
                recordsInspectedCount: 31,
                recordCountPrecision: "EXACT"
            }
        ];
    }
}
