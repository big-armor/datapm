import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";

import { TrendingComponent } from "./trending.component";

describe("TrendingComponent", () => {
    let component: TrendingComponent;
    let fixture: ComponentFixture<TrendingComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TrendingComponent],
            imports: [MatButtonModule, MatCardModule, MatChipsModule, MatIconModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(TrendingComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
