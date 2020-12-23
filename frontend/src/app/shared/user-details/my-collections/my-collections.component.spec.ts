import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MyCollectionsComponent } from "./my-collections.component";

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
                MatDialogModule,
                MatIconModule,
                MatProgressSpinnerModule,
                MatSlideToggleModule
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
