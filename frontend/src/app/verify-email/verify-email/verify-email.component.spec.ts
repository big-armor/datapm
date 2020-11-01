import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { RouterTestingModule } from "@angular/router/testing";
import { ToastrModule } from "ngx-toastr";

import { VerifyEmailComponent } from "./verify-email.component";

describe("VerifyEmailComponent", () => {
    let component: VerifyEmailComponent;
    let fixture: ComponentFixture<VerifyEmailComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [VerifyEmailComponent],
            imports: [RouterTestingModule, ToastrModule.forRoot(), MatDialogModule]
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
