import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { CreateCatalogComponent } from "./create-catalog.component";

describe("CreateCatalogComponent", () => {
    let component: CreateCatalogComponent;
    let fixture: ComponentFixture<CreateCatalogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CreateCatalogComponent],
            imports: [MatDialogModule, ReactiveFormsModule, MatProgressSpinnerModule],
            providers: [
                {
                    provide: MatDialogRef,
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
