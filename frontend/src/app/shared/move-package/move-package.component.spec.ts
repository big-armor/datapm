import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { MovePackageComponent } from "./move-package.component";

describe("MovePackageComponent", () => {
    let component: MovePackageComponent;
    let fixture: ComponentFixture<MovePackageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [MovePackageComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(MovePackageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
