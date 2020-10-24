import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { TrendingComponent } from "./trending.component";

import { MaterialModule } from "../../material.module";

describe("TrendingComponent", () => {
    let component: TrendingComponent;
    let fixture: ComponentFixture<TrendingComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [TrendingComponent],
            imports: [MaterialModule]
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
