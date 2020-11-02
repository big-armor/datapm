import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatDialogRef } from "@angular/material/dialog";
import { RouterTestingModule } from "@angular/router/testing";
import { MaterialModule } from "src/app/material.module";

import { SignUpDialogComponent } from "./sign-up-dialog.component";

describe("SignUpDialogComponent", () => {
    let component: SignUpDialogComponent;
    let fixture: ComponentFixture<SignUpDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SignUpDialogComponent],
            imports: [FormsModule, ReactiveFormsModule, RouterTestingModule, MaterialModule],
            providers: [{ provide: MatDialogRef, useValue: {} }]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SignUpDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
