import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";

import { CatalogPermissionsComponent } from "./catalog-permissions.component";

describe("CollectionPermissionsComponent", () => {
    let component: CatalogPermissionsComponent;
    let fixture: ComponentFixture<CatalogPermissionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CatalogPermissionsComponent],
            imports: [MatDialogModule, MatSlideToggleModule, MatTableModule, MatSnackBarModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CatalogPermissionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
