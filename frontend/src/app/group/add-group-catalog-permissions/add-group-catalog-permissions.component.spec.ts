import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { AddGroupCatalogPermissionsComponent } from "./add-group-catalog-permissions.component";

describe("AddGroupComponent", () => {
    let component: AddGroupCatalogPermissionsComponent;
    let fixture: ComponentFixture<AddGroupCatalogPermissionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [AddGroupCatalogPermissionsComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AddGroupCatalogPermissionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
