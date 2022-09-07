import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";
import { MatTableModule } from "@angular/material/table";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { UserDetailsComponent } from "./user-details.component";
import { MatSnackBarModule } from "@angular/material/snack-bar";

describe("UserDetailsComponent", () => {
    let component: UserDetailsComponent;
    let fixture: ComponentFixture<UserDetailsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [UserDetailsComponent],
            imports: [
                MatDialogModule,
                MatTableModule,
                ApolloTestingModule,
                RouterTestingModule,
                FormsModule,
                MatSnackBarModule,
                MatProgressSpinnerModule,
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
        fixture = TestBed.createComponent(UserDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
