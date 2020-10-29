import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { RouterModule } from "@angular/router";
import { MaterialModule } from "src/app/material.module";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { EMPTY } from "rxjs";

import { CatalogsComponent } from "./catalogs.component";

describe("CatalogsComponent", () => {
    let component: CatalogsComponent;
    let fixture: ComponentFixture<CatalogsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CatalogsComponent],
            imports: [
                RouterModule.forRoot([]),
                MaterialModule,
                ApolloTestingModule,
                RouterTestingModule,
                FormsModule,
                ReactiveFormsModule
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
        fixture = TestBed.createComponent(CatalogsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
