import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

import { SharedModule } from "../../shared/shared.module";
import { AddPackageComponent } from "./add-package.component";

describe("AddPackageComponent", () => {
    let component: AddPackageComponent;
    let fixture: ComponentFixture<AddPackageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [AddPackageComponent],
            imports: [ReactiveFormsModule, MatDialogModule, MatAutocompleteModule, SharedModule],
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
        fixture = TestBed.createComponent(AddPackageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
