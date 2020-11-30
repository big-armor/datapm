import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { FewPackagesAlertComponent } from "./few-packages-alert.component";

describe("FewPackagesAlertComponent", () => {
    let component: FewPackagesAlertComponent;
    let fixture: ComponentFixture<FewPackagesAlertComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [FewPackagesAlertComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(FewPackagesAlertComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
