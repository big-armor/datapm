import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { LatestComponent } from "./latest.component";

import { SharedModule } from "../../shared/shared.module";

describe("LatestComponent", () => {
    let component: LatestComponent;
    let fixture: ComponentFixture<LatestComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [LatestComponent],
            imports: [ApolloTestingModule, MatProgressSpinnerModule, SharedModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(LatestComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
