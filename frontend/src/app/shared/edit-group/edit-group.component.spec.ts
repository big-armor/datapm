import { HttpClientModule } from "@angular/common/http";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { CoverComponent } from "../cover/cover.component";
import { InputComponent } from "../input/input.component";
import { InputErrorPipe } from "../pipes/input-error.pipe";

import { EditGroupComponent } from "./edit-group.component";

describe("EditGroupComponent", () => {
    let component: EditGroupComponent;
    let fixture: ComponentFixture<EditGroupComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EditGroupComponent, CoverComponent, InputComponent, InputErrorPipe],
            imports: [
                ReactiveFormsModule,
                HttpClientModule,
                MatDialogModule,
                MatProgressSpinnerModule,
                MatSlideToggleModule,
                MatIconModule
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
        fixture = TestBed.createComponent(EditGroupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
