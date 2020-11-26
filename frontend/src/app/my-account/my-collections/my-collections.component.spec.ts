import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MyCollectionsComponent } from "./my-collections.component";
import { SharedModule } from "../../shared/shared.module";

describe("MyCollectionsComponent", () => {
    let component: MyCollectionsComponent;
    let fixture: ComponentFixture<MyCollectionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [MyCollectionsComponent],
            imports: [
                ApolloTestingModule,
                RouterTestingModule,
                MatButtonModule,
                MatCardModule,
                MatChipsModule,
                MatIconModule,
                MatProgressSpinnerModule,
                SharedModule
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MyCollectionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
