import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { UserInviteInputComponent } from "./user-invite-input.component";

describe("UserInviteInputComponent", () => {
    let component: UserInviteInputComponent;
    let fixture: ComponentFixture<UserInviteInputComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [UserInviteInputComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(UserInviteInputComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
