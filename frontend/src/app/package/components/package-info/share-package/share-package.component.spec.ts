import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { SharePackageComponent } from "./share-package.component";

describe("SharePackageComponent", () => {
    let component: SharePackageComponent;
    let fixture: ComponentFixture<SharePackageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SharePackageComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SharePackageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
