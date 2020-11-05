import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { SharedModule } from "src/app/shared/shared.module";

import { PackagesComponent } from "./packages.component";

describe("PackagesComponent", () => {
    let component: PackagesComponent;
    let fixture: ComponentFixture<PackagesComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackagesComponent],
            imports: [RouterTestingModule, SharedModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackagesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
