import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { PackageSchemaComponent } from "./package-schema.component";

import { MaterialModule } from "../../material.module";

describe("PackageSchemaComponent", () => {
    let component: PackageSchemaComponent;
    let fixture: ComponentFixture<PackageSchemaComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageSchemaComponent],
            imports: [MaterialModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageSchemaComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
