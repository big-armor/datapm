import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";

import { SharedModule } from "../../shared/shared.module";
import { UserDetailsPageComponent } from "./user-details-page.component";

describe("UserDetailsPageComponent", () => {
    let component: UserDetailsPageComponent;
    let fixture: ComponentFixture<UserDetailsPageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [UserDetailsPageComponent],
            imports: [HttpClientModule, RouterTestingModule, ApolloTestingModule, SharedModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(UserDetailsPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
