import { Component } from "@angular/core";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { ReactiveFormsModule } from "@angular/forms";

import { MyAccountComponent } from "./my-account.component";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";
import { SharedModule } from "../../shared/shared.module";

@Component({
    template: ""
})
class DummyComponent {}

describe("MyAccountComponent", () => {
    let component: MyAccountComponent;
    let fixture: ComponentFixture<MyAccountComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [MyAccountComponent],
            imports: [
                HttpClientModule,
                RouterTestingModule.withRoutes([{ path: "me", component: DummyComponent }]),
                ApolloTestingModule,
                ReactiveFormsModule,
                MatDialogModule,
                MatProgressSpinnerModule,
                SharedModule
            ],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            firstChild: {
                                routeConfig: {
                                    path: ""
                                }
                            }
                        },
                        fragment: new Subject()
                    }
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
