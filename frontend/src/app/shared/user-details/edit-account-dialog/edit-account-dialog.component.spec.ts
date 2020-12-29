import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatIconModule } from "@angular/material/icon";
import { RouterTestingModule } from "@angular/router/testing";
import { ImageService } from "src/app/services/image.service";

import { EditAccountDialogComponent } from "./edit-account-dialog.component";
import { AvatarComponent } from "../../avatar/avatar.component";
import { CoverComponent } from "../../cover/cover.component";

describe("EditAccountDialogComponent", () => {
    let component: EditAccountDialogComponent;
    let fixture: ComponentFixture<EditAccountDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EditAccountDialogComponent, CoverComponent, AvatarComponent],
            imports: [
                HttpClientModule,
                MatDialogModule,
                MatIconModule,
                MatSlideToggleModule,
                RouterTestingModule,
                ReactiveFormsModule,
                FormsModule
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
