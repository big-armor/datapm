import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatButtonModule } from "@angular/material/button";

import { DeleteCatalogComponent } from "./delete-catalog.component";

describe("DeleteCatalogComponent", () => {
    let component: DeleteCatalogComponent;
    let fixture: ComponentFixture<DeleteCatalogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [DeleteCatalogComponent],
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
        fixture = TestBed.createComponent(DeleteCatalogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
