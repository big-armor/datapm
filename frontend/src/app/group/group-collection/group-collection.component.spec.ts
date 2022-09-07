import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";

import { GroupCollectionsComponent } from "./group-collection.component";

describe("GroupCollectionsComponent", () => {
    let component: GroupCollectionsComponent;
    let fixture: ComponentFixture<GroupCollectionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [GroupCollectionsComponent],
            imports: [MatDialogModule, MatSlideToggleModule, MatTableModule, MatSnackBarModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(GroupCollectionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
