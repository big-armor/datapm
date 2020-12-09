import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { HttpClientModule } from "@angular/common/http";
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatIconModule } from "@angular/material/icon";
import { CoverComponent } from "../cover/cover.component";
import { InputComponent } from "../input/input.component";
import { InputErrorPipe } from "../pipes/input-error.pipe";

import { EditCollectionComponent } from "./edit-collection.component";

describe("EditCollectionComponent", () => {
    let component: EditCollectionComponent;
    let fixture: ComponentFixture<EditCollectionComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EditCollectionComponent, CoverComponent, InputComponent, InputErrorPipe],
            imports: [
                ReactiveFormsModule,
                HttpClientModule,
                MatDialogModule,
                MatSlideToggleModule,
                MatIconModule,
                MatProgressSpinnerModule
            ],
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
        fixture = TestBed.createComponent(EditCollectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
