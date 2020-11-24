import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatTableModule } from "@angular/material/table";

import { DetailsComponent } from "./details.component";
import { MatSnackBarModule } from "@angular/material/snack-bar";

describe("DetailsComponent", () => {
    let component: DetailsComponent;
    let fixture: ComponentFixture<DetailsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [DetailsComponent],
            imports: [
                RouterModule.forRoot([]),
                MatDialogModule,
                MatTableModule,
                ApolloTestingModule,
                RouterTestingModule,
                FormsModule,
                MatSnackBarModule,
                ReactiveFormsModule
            ],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {}
                },
                // {
                // 	provide: MatDialog,
                // 	useValue: {}
                // },
                {
                    provide: MatDialogRef,
                    useValue: {}
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
