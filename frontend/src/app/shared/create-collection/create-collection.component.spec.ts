import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { CreateCollectionComponent } from "./create-collection.component";

describe("CreateCollectionComponent", () => {
    let component: CreateCollectionComponent;
    let fixture: ComponentFixture<CreateCollectionComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CreateCollectionComponent],
            imports: [MatDialogModule, ReactiveFormsModule, MatProgressSpinnerModule],
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
        fixture = TestBed.createComponent(CreateCollectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
