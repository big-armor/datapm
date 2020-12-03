import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { HttpClientModule } from "@angular/common/http";
import { SharedModule } from "src/app/shared/shared.module";

import { PackagesComponent } from "./packages.component";
import { ApolloTestingModule } from "apollo-angular/testing";

describe("PackagesComponent", () => {
    let component: PackagesComponent;
    let fixture: ComponentFixture<PackagesComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackagesComponent],
            imports: [HttpClientModule, RouterTestingModule, ApolloTestingModule, SharedModule]
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
