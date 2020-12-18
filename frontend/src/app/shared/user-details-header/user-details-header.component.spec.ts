import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { SharedModule } from "../../shared/shared.module";
import { UserDetailsHeaderComponent } from "./user-details-header.component";

fdescribe("UserDetailsHeaderComponent", () => {
    let component: UserDetailsHeaderComponent;
    let fixture: ComponentFixture<UserDetailsHeaderComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [UserDetailsHeaderComponent],
            imports: [HttpClientModule, SharedModule]
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
