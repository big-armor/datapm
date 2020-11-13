import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { RouterTestingModule } from "@angular/router/testing";
import { ImageService } from "src/app/services/image.service";
import { SharedModule } from "src/app/shared/shared.module";

import { EditAccountDialogComponent } from "./edit-account-dialog.component";

describe("EditAccountDialogComponent", () => {
    let component: EditAccountDialogComponent;
    let fixture: ComponentFixture<EditAccountDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EditAccountDialogComponent],
            imports: [
                HttpClientModule,
                MatDialogModule,
                MatSlideToggleModule,
                RouterTestingModule,
                ReactiveFormsModule,
                FormsModule,
                SharedModule
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
                },
                ImageService
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(EditAccountDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
