import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatStepperModule } from "@angular/material/stepper";

import { LoginDialogComponent } from "./login-dialog.component";
import { InputComponent } from "../../input/input.component";
import { InputErrorPipe } from "../../pipes/input-error.pipe";

describe("LoginDialogComponent", () => {
    let component: LoginDialogComponent;
    let fixture: ComponentFixture<LoginDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [LoginDialogComponent, InputErrorPipe, InputComponent],
            imports: [
                FormsModule,
                ReactiveFormsModule,
                RouterTestingModule,
                NoopAnimationsModule,
                MatButtonModule,
                MatDialogModule,
                MatStepperModule,
                MatProgressSpinnerModule
            ],
            providers: [
                {
                    provide: MatDialogRef,
                    useValue: {}
                }
            ]
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
