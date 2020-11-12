import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { ActivityComponent } from "./activity.component";
import { SharedModule } from "../../shared/shared.module";

describe("ActivityComponent", () => {
    let component: ActivityComponent;
    let fixture: ComponentFixture<ActivityComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ActivityComponent],
            imports: [
                ApolloTestingModule,
                RouterTestingModule,
                MatButtonModule,
                MatCardModule,
                MatChipsModule,
                MatIconModule,
                SharedModule
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ActivityComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
