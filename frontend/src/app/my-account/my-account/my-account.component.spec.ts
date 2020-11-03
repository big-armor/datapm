import { Component } from "@angular/core";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { MyAccountComponent } from "./my-account.component";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule, ApolloTestingController } from "apollo-angular/testing";
import { MaterialModule } from "../material.module";
import { MatDialog, MatDialogConfig, MAT_DIALOG_DATA } from "@angular/material/dialog";

@Component({
    template: ""
})
class DummyComponent {}

describe("MyAccountComponent", () => {
    let component: MyAccountComponent;
    let fixture: ComponentFixture<MyAccountComponent>;
    let controller: ApolloTestingController;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [MyAccountComponent],
            imports: [
                RouterTestingModule.withRoutes([{ path: "me", component: DummyComponent }]),
                ApolloTestingModule,
                MaterialModule
            ],
            providers: [
                {
                    provide: MAT_DIALOG_DATA,
                    useValue: {}
                },
                {
                    provide: MatDialog,
                    useValue: {}
                },
                {
                    provide: MatDialogConfig,
                    useValue: {}
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MyAccountComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
