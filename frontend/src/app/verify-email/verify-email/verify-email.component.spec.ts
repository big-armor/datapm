import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { RouterTestingModule } from "@angular/router/testing";

import { VerifyEmailComponent } from "./verify-email.component";

describe("VerifyEmailComponent", () => {
    let component: VerifyEmailComponent;
    let fixture: ComponentFixture<VerifyEmailComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [VerifyEmailComponent],
            imports: [RouterTestingModule, NoopAnimationsModule, MatDialogModule, MatSnackBarModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(VerifyEmailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
