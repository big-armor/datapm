import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MaterialModule } from "../material.module";

import { PackageComponent } from "./package.component";

describe("PackageComponent", () => {
    let component: PackageComponent;
    let fixture: ComponentFixture<PackageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageComponent],
            imports: [MaterialModule, RouterTestingModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
