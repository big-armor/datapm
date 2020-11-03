import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";
import { MaterialModule } from "src/app/material.module";

import { LoginDialogComponent } from "./login-dialog.component";

describe("LoginDialogComponent", () => {
    let component: LoginDialogComponent;
    let fixture: ComponentFixture<LoginDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [LoginDialogComponent],
            imports: [MaterialModule, FormsModule, ReactiveFormsModule, RouterTestingModule, NoopAnimationsModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(LoginDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
