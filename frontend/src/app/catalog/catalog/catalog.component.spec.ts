import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { CatalogComponent } from "./catalog.component";
import { CatalogDetailsComponent } from "../catalog-details/catalog-details.component";

describe("CatalogComponent", () => {
    let component: CatalogComponent;
    let fixture: ComponentFixture<CatalogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CatalogComponent, CatalogDetailsComponent],
            imports: [RouterTestingModule, MatDialogModule, MatProgressSpinnerModule, ApolloTestingModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CatalogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
