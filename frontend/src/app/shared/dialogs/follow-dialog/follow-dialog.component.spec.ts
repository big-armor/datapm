import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { FollowDialogComponent } from "./follow-dialog.component";

describe("FollowDialogComponent", () => {
    let component: FollowDialogComponent;
    let fixture: ComponentFixture<FollowDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [FollowDialogComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FollowDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
