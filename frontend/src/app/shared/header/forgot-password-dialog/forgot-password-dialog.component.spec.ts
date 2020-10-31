import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { ForgotPasswordDialogComponent } from "./forgot-password-dialog.component";

describe("ForgotPasswordDialogComponent", () => {
    let component: ForgotPasswordDialogComponent;
    let fixture: ComponentFixture<ForgotPasswordDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ForgotPasswordDialogComponent],
            imports: [FormsModule, ReactiveFormsModule]
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
