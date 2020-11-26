import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";

import { ForgotPasswordDialogComponent } from "./forgot-password-dialog.component";
import { InputComponent } from "../../input/input.component";
import { InputErrorPipe } from "../../pipes/input-error.pipe";

describe("ForgotPasswordDialogComponent", () => {
    let component: ForgotPasswordDialogComponent;
    let fixture: ComponentFixture<ForgotPasswordDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ForgotPasswordDialogComponent, InputErrorPipe, InputComponent],
            imports: [FormsModule, ReactiveFormsModule, MatDialogModule],
            providers: [
                {
                    provide: MatDialogRef,
                    useValue: {}
                }
            ]
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
