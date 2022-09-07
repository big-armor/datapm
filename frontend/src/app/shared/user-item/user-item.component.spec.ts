import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { HttpClientModule } from "@angular/common/http";
import { UserItemComponent } from "./user-item.component";
import { MatCardModule } from "@angular/material/card";
import { SharedModule } from "src/app/shared/shared.module";

const userItem: any = {
    creator: {
        username: "tylerwilliams",
        firstName: "Tyler",
        lastName: "Williams"
    },
    displayName: "Weather Stations",
    description:
        "Short description preview of the product and some, lorem ipsum dolor sit amet, consectetur adipiscing elit. Risus orci, sem nullam maecenas sed mauris. Sed turpis lorem vitae sit. Amet, in aliquet odio id",
    identifier: {
        catalogSlug: "noaa",
        userSlug: "weather-stations"
    },
    updatedAt: new Date(new Date().getTime() - 300000)
};

describe("UserItemComponent", () => {
    let component: UserItemComponent;
    let fixture: ComponentFixture<UserItemComponent>;

    beforeEach(async(() => {
        const routerSpy = jasmine.createSpyObj("Router", ["navigateByUrl"]);
        TestBed.configureTestingModule({
            declarations: [UserItemComponent],
            imports: [HttpClientModule, RouterTestingModule, MatCardModule, SharedModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(UserItemComponent);
        component = fixture.componentInstance;
        component.item = userItem;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
