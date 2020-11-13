import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HomepageComponent } from "./homepage.component";

import { RouterTestingModule } from "@angular/router/testing";

describe("HomepageComponent", () => {
    let component: HomepageComponent;
    let fixture: ComponentFixture<HomepageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [HomepageComponent],
            imports: [RouterTestingModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(HomepageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
