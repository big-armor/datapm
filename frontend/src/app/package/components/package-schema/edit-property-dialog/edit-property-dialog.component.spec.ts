import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { EditPropertyDialogComponent } from "./edit-property-dialog.component";

describe("EditPropertyDialogComponent", () => {
    let component: EditPropertyDialogComponent;
    let fixture: ComponentFixture<EditPropertyDialogComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EditPropertyDialogComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(EditPropertyDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
