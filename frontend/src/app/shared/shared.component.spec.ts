import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MaterialModule } from "../material.module";

import { SharedComponent } from "./shared.component";

describe("SharedComponent", () => {
    let component: SharedComponent;
    let fixture: ComponentFixture<SharedComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SharedComponent],
            imports: [RouterTestingModule, ApolloTestingModule, MaterialModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SharedComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
