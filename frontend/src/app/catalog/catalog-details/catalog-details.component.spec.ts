import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MatDialogModule } from "@angular/material/dialog";

import { CatalogDetailsComponent } from "./catalog-details.component";

describe("CatalogDetailsComponent", () => {
    let component: CatalogDetailsComponent;
    let fixture: ComponentFixture<CatalogDetailsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CatalogDetailsComponent],
            imports: [RouterTestingModule, ApolloTestingModule, MatDialogModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CatalogDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
