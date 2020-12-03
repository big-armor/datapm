import { HttpClientModule } from "@angular/common/http";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { ButtonComponent } from "../button/button.component";
import { CoverComponent } from "../cover/cover.component";
import { InputComponent } from "../input/input.component";
import { InputErrorPipe } from "../pipes/input-error.pipe";

import { EditCatalogComponent } from "./edit-catalog.component";

describe("EditCatalogComponent", () => {
    let component: EditCatalogComponent;
    let fixture: ComponentFixture<EditCatalogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EditCatalogComponent, CoverComponent, InputComponent, ButtonComponent, InputErrorPipe],
            imports: [ReactiveFormsModule, HttpClientModule, MatDialogModule, MatSlideToggleModule, MatIconModule],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {
                        identifier: {
                            collectionSlug: ""
                        }
                    }
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
        fixture = TestBed.createComponent(EditCatalogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
