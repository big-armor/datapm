import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { HttpClientModule } from "@angular/common/http";
import { PackageItemComponent } from "../../package-item/package-item.component";

import { UserPackagesComponent } from "./user-packages.component";
import { ApolloTestingModule } from "apollo-angular/testing";

describe("UserPackagesComponent", () => {
    let component: UserPackagesComponent;
    let fixture: ComponentFixture<UserPackagesComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [UserPackagesComponent, PackageItemComponent],
            imports: [HttpClientModule, RouterTestingModule, ApolloTestingModule, MatProgressSpinnerModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(UserPackagesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
