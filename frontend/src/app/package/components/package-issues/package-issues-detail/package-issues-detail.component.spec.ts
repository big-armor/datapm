import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { PackageIssuesDetailComponent } from "./package-issues-detail.component";

describe("PackageIssuesDetailComponent", () => {
    let component: PackageIssuesDetailComponent;
    let fixture: ComponentFixture<PackageIssuesDetailComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageIssuesDetailComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageIssuesDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
