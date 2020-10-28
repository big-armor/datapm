import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { PackageItemComponent } from "./package-item.component";
import { MaterialModule } from "src/app/material.module";

const packageItem: any = {
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
        packageSlug: "weather-stations"
    },
    updatedAt: new Date(new Date().getTime() - 300000)
};

describe("PackageItemComponent", () => {
    let component: PackageItemComponent;
    let fixture: ComponentFixture<PackageItemComponent>;

    beforeEach(async(() => {
        const routerSpy = jasmine.createSpyObj("Router", ["navigateByUrl"]);
        TestBed.configureTestingModule({
            declarations: [PackageItemComponent],
            imports: [RouterTestingModule, MaterialModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageItemComponent);
        component = fixture.componentInstance;
        component.item = packageItem;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
