import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";

import { PackageDetailComponent } from "./package-detail.component";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";

describe("PackageDetailComponent", () => {
    let component: PackageDetailComponent;
    let fixture: ComponentFixture<PackageDetailComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageDetailComponent],
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
        fixture = TestBed.createComponent(PackageDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
