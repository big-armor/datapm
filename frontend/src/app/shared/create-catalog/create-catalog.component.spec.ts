import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";

import { CreateCatalogComponent } from "./create-catalog.component";

describe("CreateCatalogComponent", () => {
    let component: CreateCatalogComponent;
    let fixture: ComponentFixture<CreateCatalogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CreateCatalogComponent],
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
        fixture = TestBed.createComponent(CreateCatalogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
