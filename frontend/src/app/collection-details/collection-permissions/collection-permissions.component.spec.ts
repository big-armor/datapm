import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { CollectionPermissionsComponent } from "./collection-permissions.component";

describe("CollectionPermissionsComponent", () => {
    let component: CollectionPermissionsComponent;
    let fixture: ComponentFixture<CollectionPermissionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CollectionPermissionsComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CollectionPermissionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
