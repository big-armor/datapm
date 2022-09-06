import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { AddGroupCollectionPermissionsComponent } from "./add-group-collection-permissions.component";

describe("AddGroupComponent", () => {
    let component: AddGroupCollectionPermissionsComponent;
    let fixture: ComponentFixture<AddGroupCollectionPermissionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [AddGroupCollectionPermissionsComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AddGroupCollectionPermissionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
