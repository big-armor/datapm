import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterTestingModule } from "@angular/router/testing";
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";

import { EditPasswordDialogComponent } from "./edit-password-dialog.component";
import { MatSnackBarModule } from "@angular/material/snack-bar";

describe("EditPasswordDialogComponent", () => {
    let component: EditPasswordDialogComponent;
    let fixture: ComponentFixture<EditPasswordDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EditPasswordDialogComponent],
            imports: [
                RouterTestingModule,
                MatButtonModule,
                MatDialogModule,
                MatSnackBarModule,
                FormsModule,
                ReactiveFormsModule
            ],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {}
                },
                {
                    provide: MatDialogRef,
                    useValue: {}
                },
                {
                    provide: MatDialog,
                    useValue: {}
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(EditPasswordDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
