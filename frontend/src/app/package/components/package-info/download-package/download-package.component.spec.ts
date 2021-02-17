import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { DownloadPackageComponent } from "./download-package.component";

describe("DownloadPackageComponent", () => {
    let component: DownloadPackageComponent;
    let fixture: ComponentFixture<DownloadPackageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [DownloadPackageComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(DownloadPackageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
