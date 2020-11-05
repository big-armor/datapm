import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

import { PackageVersionComponent } from "./package-version.component";

describe("PackageVersionComponent", () => {
    let component: PackageVersionComponent;
    let fixture: ComponentFixture<PackageVersionComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageVersionComponent],
            imports: [MatButtonModule, MatIconModule]
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
