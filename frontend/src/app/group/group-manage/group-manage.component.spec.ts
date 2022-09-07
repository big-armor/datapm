import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";

import { GroupManageComponent } from "./group-manage.component";

describe("GroupManageComponent", () => {
    let component: GroupManageComponent;
    let fixture: ComponentFixture<GroupManageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [GroupManageComponent],
            imports: [MatDialogModule, MatSlideToggleModule, MatTableModule, MatSnackBarModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(GroupManageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
