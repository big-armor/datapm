import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { GroupAdminConfirmationComponent } from "./admin-status-confirmation.component";

describe("AdminStatusConfirmationComponent", () => {
    let component: GroupAdminConfirmationComponent;
    let fixture: ComponentFixture<GroupAdminConfirmationComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [GroupAdminConfirmationComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(GroupAdminConfirmationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
