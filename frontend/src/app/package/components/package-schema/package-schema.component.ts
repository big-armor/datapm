import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    ViewChildren
} from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { ActivatedRoute, Router } from "@angular/router";
import { ContentLabel, PackageFile, Property, Schema, ValueTypeStatistics } from "datapm-lib";
import { Subject } from "rxjs";
import { Clipboard } from "@angular/cdk/clipboard";
import { SnackBarService } from "src/app/services/snackBar.service";
import { EditPropertyDialogComponent } from "./edit-property-dialog/edit-property-dialog.component";
import { packageToIdentifier } from "src/app/helpers/IdentifierHelper";
import { Package, Permission } from "src/generated/graphql";
import { MatExpansionPanel } from "@angular/material/expansion";

@Component({
    selector: "schema",
    templateUrl: "./package-schema.component.html",
    styleUrls: ["./package-schema.component.scss"]
})
export class PackageSchemaComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
    private readonly MAX_PROPERTIES_TO_SHOW_INITIALLY = 10;

    @Input()
    public package: Package;

    @Input()
    public packageFile: PackageFile;

    @Input()
    public schema: Schema;

    @ViewChildren(MatExpansionPanel)
    public collapsableProperties: ElementRef<MatExpansionPanel>;

    public propertiesToShowCount = this.MAX_PROPERTIES_TO_SHOW_INITIALLY;

    public shouldShowMorePropertiesButton: boolean = false;
    public isShowingMorePropertiesText: boolean = false;

    public focusedPropertyId: string;

    public hasEditPermissions: boolean;

    private unsubscribe$ = new Subject();

    constructor(
        private dialog: MatDialog,
        private router: Router,
        private route: ActivatedRoute,
        private snackBarService: SnackBarService,
        private clipboard: Clipboard,
        private cdr: ChangeDetectorRef
    ) {}

    public ngOnChanges(): void {
        this.shouldShowMorePropertiesButton =
            this.schemaPropertiesLength(this.schema) > this.MAX_PROPERTIES_TO_SHOW_INITIALLY;
    }

    public ngOnInit(): void {
        this.hasEditPermissions = this.package.myPermissions.includes(Permission.EDIT);
    }

    public ngAfterViewInit(): void {
        const fragment = this.route.snapshot.fragment;
        if (fragment) {
            const el: any = document.getElementById(fragment);
            if (el) {
                if (el.hidden) {
                    this.toggleShowMoreProperties();
                }

                setTimeout(() => {
                    this.focusedPropertyId = fragment;
                    el.scrollIntoView({ behavior: "smooth" });
                    this.cdr.detectChanges();
                });
            }
        }
    }

    public ngOnDestroy(): void {
        this.unsubscribe$.next();
        this.unsubscribe$.complete();
    }

    public toggleShowMoreProperties(): void {
        this.isShowingMorePropertiesText = !this.isShowingMorePropertiesText;
        this.propertiesToShowCount = this.isShowingMorePropertiesText
            ? this.schemaPropertiesLength(this.schema)
            : this.MAX_PROPERTIES_TO_SHOW_INITIALLY;
    }

    public getPropertyTypes(property: Property): string {
        const keys = Object.keys(property.types).sort();
        return keys.join(", ");
    }

    public schemaPropertiesLength(schema: Schema): number {
        return Object.keys(schema.properties).length;
    }

    public createIssue(property: Schema) {
        this.router.navigate(["issues/new"], {
            relativeTo: this.route,
            queryParams: {
                subject: property.title,
                content: this.createLink(property)
            }
        });
    }

    public copyLink(property: Schema) {
        const url = packageToIdentifier(this.package.identifier) + "#" + this.getPropertyId(property);
        this.clipboard.copy(url);
        this.snackBarService.openSnackBar("copied to clipboard!", "");
    }

    public createLink(property: Schema) {
        return packageToIdentifier(this.package.identifier) + "#" + this.getPropertyId(property);
    }

    public getPropertyId(property: Schema): string {
        return this.schema.title + "-" + property.title;
    }

    public editPropertyDialog(property: any) {
        this.dialog.open(EditPropertyDialogComponent, {
            width: "500px",
            disableClose: true,
            data: {
                schema: this.schema,
                property: property,
                packageFile: this.packageFile,
                package: this.package
            }
        });
    }

    public stringOptions(valueTypes: ValueTypeStatistics): { name: string; value: number }[] {
        return Object.keys(valueTypes)
            .map((v) => {
                return {
                    name: v,
                    value: valueTypes[v]
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    public getAllPropertyChips(property) {
        let labels = new Set<ContentLabel>();
        let values: any[] = Object.values(property.valueTypes);

        values.forEach((value) => {
            if (value.contentLabels) {
                value.contentLabels.forEach((l) => {

                    let foundLabel = false;
                    
                    labels.forEach((existingLabel) => {
                        if(existingLabel.label == l.label) {
                            foundLabel = true;
                        }
                    })

                    if(!foundLabel)
                        labels.add(l);
                });
            } else {
                value.contentLabels = [];
            }
        });
        return [...labels];
    }

    public getPropertyChips(value) {
        let labels = new Set<ContentLabel>();

        if (value.contentLabels) {
            value.contentLabels.forEach((l) => {
                labels.add(l);
            });
        } else {
            value.contentLabels = [];
        }
        return [...labels].filter(l => !l.hidden);
    }
}
