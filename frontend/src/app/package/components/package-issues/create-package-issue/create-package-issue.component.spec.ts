import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { CreatePackageIssueComponent } from "./create-package-issue.component";

describe("CreatePackageIssueComponent", () => {
    let component: CreatePackageIssueComponent;
    let fixture: ComponentFixture<CreatePackageIssueComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CreatePackageIssueComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CreatePackageIssueComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
