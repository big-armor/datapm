import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";

import { PackageVersionComponent } from "./package-version.component";
import { SharedModule } from "../../../shared/shared.module";

describe("PackageVersionComponent", () => {
    let component: PackageVersionComponent;
    let fixture: ComponentFixture<PackageVersionComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageVersionComponent],
            imports: [MatButtonModule, MatIconModule, SharedModule],
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
        fixture = TestBed.createComponent(PackageVersionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
