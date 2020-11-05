import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { ActivityComponent } from "./activity.component";

describe("ActivityComponent", () => {
    let component: ActivityComponent;
    let fixture: ComponentFixture<ActivityComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ActivityComponent],
            imports: [RouterTestingModule, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule]
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
