import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ApolloTestingModule } from "apollo-angular/testing";

import { LatestComponent } from "./latest.component";

import { MaterialModule } from "../../material.module";
import { SharedModule } from "../../shared/shared.module";

describe("LatestComponent", () => {
    let component: LatestComponent;
    let fixture: ComponentFixture<LatestComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [LatestComponent],
            imports: [ApolloTestingModule, MaterialModule, SharedModule]
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
