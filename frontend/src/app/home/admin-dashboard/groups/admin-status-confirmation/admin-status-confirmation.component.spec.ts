import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { AdminStatusConfirmationComponent } from "./admin-status-confirmation.component";

describe("AdminStatusConfirmationComponent", () => {
    let component: AdminStatusConfirmationComponent;
    let fixture: ComponentFixture<AdminStatusConfirmationComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [AdminStatusConfirmationComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AdminStatusConfirmationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
