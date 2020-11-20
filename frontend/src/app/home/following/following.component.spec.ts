import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";

import { FollowingComponent } from "./following.component";
import { SharedModule } from "../../shared/shared.module";

describe("FollowingComponent", () => {
    let component: FollowingComponent;
    let fixture: ComponentFixture<FollowingComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [FollowingComponent],
            imports: [HttpClientModule, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, SharedModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FollowingComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
