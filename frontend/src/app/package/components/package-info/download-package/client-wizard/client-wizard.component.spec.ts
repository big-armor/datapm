import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { ClientWizardComponent } from "./client-wizard.component";

describe("ClientWizardComponent", () => {
    let component: ClientWizardComponent;
    let fixture: ComponentFixture<ClientWizardComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ClientWizardComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(ClientWizardComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
