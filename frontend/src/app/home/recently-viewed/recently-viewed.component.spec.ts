import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { RecentlyViewedComponent } from "./recently-viewed.component";

import { SharedModule } from "../../shared/shared.module";

describe("LatestComponent", () => {
    let component: RecentlyViewedComponent;
    let fixture: ComponentFixture<RecentlyViewedComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [RecentlyViewedComponent],
            imports: [ApolloTestingModule, MatProgressSpinnerModule, SharedModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(RecentlyViewedComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
