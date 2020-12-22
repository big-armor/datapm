import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { RouterModule } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTableModule } from "@angular/material/table";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { CatalogsComponent } from "./catalogs.component";

describe("CatalogsComponent", () => {
    let component: CatalogsComponent;
    let fixture: ComponentFixture<CatalogsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CatalogsComponent],
            imports: [
                RouterModule.forRoot([]),
                MatCardModule,
                MatDialogModule,
                MatTableModule,
                MatSlideToggleModule,
                MatProgressSpinnerModule,
                ApolloTestingModule,
                RouterTestingModule,
                FormsModule,
                ReactiveFormsModule,
                MatProgressSpinnerModule
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CatalogsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
