import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { CollectionAutocompleteComponent } from "./collection-autocomplete.component";

describe("CollectionAutocompleteComponent", () => {
    let component: CollectionAutocompleteComponent;
    let fixture: ComponentFixture<CollectionAutocompleteComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CollectionAutocompleteComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CollectionAutocompleteComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
