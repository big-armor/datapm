import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";

import { PackageDescriptionComponent } from "./package-description.component";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";

describe("PackageDescriptionComponent", () => {
    let component: PackageDescriptionComponent;
    let fixture: ComponentFixture<PackageDescriptionComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageDescriptionComponent],
            imports: [RouterTestingModule],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        parent: {
                            data: new Subject()
                        }
                    }
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageDescriptionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
