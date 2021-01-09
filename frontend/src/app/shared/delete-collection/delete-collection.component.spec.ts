import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";

import { DeleteCollectionComponent } from "./delete-collection.component";

describe("DeleteCollectionComponent", () => {
    let component: DeleteCollectionComponent;
    let fixture: ComponentFixture<DeleteCollectionComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [DeleteCollectionComponent],
            imports: [
                FormsModule,
                MatDialogModule,
                MatFormFieldModule,
                MatInputModule,
                MatButtonModule,
                NoopAnimationsModule
            ],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {}
                },
                {
                    provide: MatDialogRef,
                    useValue: {}
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DeleteCollectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
