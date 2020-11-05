import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";

import { FollowingComponent } from "./following.component";

describe("FollowingComponent", () => {
    let component: FollowingComponent;
    let fixture: ComponentFixture<FollowingComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [FollowingComponent],
            imports: [MatButtonModule, MatCardModule, MatChipsModule, MatIconModule]
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
