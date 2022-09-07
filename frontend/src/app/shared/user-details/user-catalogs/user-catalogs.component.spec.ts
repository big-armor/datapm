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

import { UserCatalogsComponent } from "./user-catalogs.component";

describe("UserCatalogsComponent", () => {
    let component: UserCatalogsComponent;
    let fixture: ComponentFixture<UserCatalogsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [UserCatalogsComponent],
            imports: [
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
        fixture = TestBed.createComponent(UserCatalogsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
