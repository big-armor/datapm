import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";

import { GroupCatalogsComponent } from "./group-catalog.component";

describe("GroupCatalogsComponent", () => {
    let component: GroupCatalogsComponent;
    let fixture: ComponentFixture<GroupCatalogsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [GroupCatalogsComponent],
            imports: [MatDialogModule, MatSlideToggleModule, MatTableModule, MatSnackBarModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(GroupCatalogsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
