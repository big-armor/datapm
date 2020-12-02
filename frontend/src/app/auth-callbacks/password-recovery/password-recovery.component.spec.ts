import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { PasswordRecoveryComponent } from "./password-recovery.component";
import { SharedModule } from "../../shared/shared.module";

describe("PasswordRecoveryComponent", () => {
    let component: PasswordRecoveryComponent;
    let fixture: ComponentFixture<PasswordRecoveryComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PasswordRecoveryComponent],
            imports: [RouterTestingModule, MatProgressSpinnerModule, SharedModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PasswordRecoveryComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
