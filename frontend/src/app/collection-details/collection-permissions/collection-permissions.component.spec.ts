import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { MatTableModule } from "@angular/material/table";

import { CollectionPermissionsComponent } from "./collection-permissions.component";

describe("CollectionPermissionsComponent", () => {
    let component: CollectionPermissionsComponent;
    let fixture: ComponentFixture<CollectionPermissionsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CollectionPermissionsComponent],
            imports: [MatSlideToggleModule, MatTableModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CollectionPermissionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
