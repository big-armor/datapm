import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { UserDetailsHeaderComponent } from "./user-details-header.component";
import { CoverComponent } from "../cover/cover.component";

describe("UserDetailsHeaderComponent", () => {
    let component: UserDetailsHeaderComponent;
    let fixture: ComponentFixture<UserDetailsHeaderComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [UserDetailsHeaderComponent, CoverComponent],
            imports: [HttpClientModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(UserDetailsHeaderComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
