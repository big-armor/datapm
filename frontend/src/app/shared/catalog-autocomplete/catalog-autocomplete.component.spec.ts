import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { CatalogAutocompleteComponent } from "./catalog-autocomplete.component";

describe("CatalogAutocompleteComponent", () => {
    let component: CatalogAutocompleteComponent;
    let fixture: ComponentFixture<CatalogAutocompleteComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CatalogAutocompleteComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CatalogAutocompleteComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
