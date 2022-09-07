import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { AddGroupPackagePermissionsComponent } from "./add-group-package-permissions.component";

describe("AddGroupComponent", () => {
    let component: AddGroupPackagePermissionsComponent;
    let fixture: ComponentFixture<AddGroupPackagePermissionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [AddGroupPackagePermissionsComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AddGroupPackagePermissionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
