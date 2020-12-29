import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { SharedModule } from "../../shared/shared.module";
import { AddUserComponent } from "./add-user.component";

describe("AddPackageComponent", () => {
    let component: AddUserComponent;
    let fixture: ComponentFixture<AddUserComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [AddUserComponent],
            imports: [ReactiveFormsModule, MatDialogModule, SharedModule],
            providers: [
                {
                    provide: MatDialogRef,
                    useValue: {}
                },
                {
                    // I was expecting this will pass the desired value
                    provide: MAT_DIALOG_DATA,
                    useValue: {}
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(AddUserComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
