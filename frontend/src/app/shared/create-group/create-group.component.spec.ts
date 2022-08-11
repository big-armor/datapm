import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";

import { CreateGroupComponent } from "./create-group.component";

describe("CreateGroupComponent", () => {
    let component: CreateGroupComponent;
    let fixture: ComponentFixture<CreateGroupComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CreateGroupComponent],
            imports: [MatDialogModule, ReactiveFormsModule, MatProgressSpinnerModule, MatSlideToggleModule],
            providers: [
                {
                    provide: MatDialogRef,
                    useValue: {}
                },
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {}
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CreateGroupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
