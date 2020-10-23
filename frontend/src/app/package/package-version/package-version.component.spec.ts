import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { PackageVersionComponent } from "./package-version.component";

import { MaterialModule } from "../../material.module";

describe("PackageVersionComponent", () => {
    let component: PackageVersionComponent;
    let fixture: ComponentFixture<PackageVersionComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageVersionComponent],
            imports: [MaterialModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageVersionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
