import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { ForgotPasswordDialogComponent } from "./forgot-password-dialog.component";

describe("ForgotPasswordDialogComponent", () => {
    let component: ForgotPasswordDialogComponent;
    let fixture: ComponentFixture<ForgotPasswordDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ForgotPasswordDialogComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ForgotPasswordDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
