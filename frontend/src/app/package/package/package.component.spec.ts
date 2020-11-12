import { Component } from "@angular/core";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";

import { PackageComponent } from "./package.component";

@Component({
    template: ""
})
class DummyComponent {}

describe("PackageComponent", () => {
    let component: PackageComponent;
    let fixture: ComponentFixture<PackageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageComponent],
            imports: [
                RouterTestingModule.withRoutes([
                    {
                        path: ":catalogSlug/:packageSlug",
                        component: PackageComponent
                    }
                ])
            ]
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
