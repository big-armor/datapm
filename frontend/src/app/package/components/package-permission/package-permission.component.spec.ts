import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatTableModule } from "@angular/material/table";
import { RouterTestingModule } from "@angular/router/testing";

import { PackagePermissionComponent } from "./package-permission.component";

fdescribe("PackagePermissionComponent", () => {
    let component: PackagePermissionComponent;
    let fixture: ComponentFixture<PackagePermissionComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackagePermissionComponent],
            imports: [MatDialogModule, RouterTestingModule, MatTableModule, MatSnackBarModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackagePermissionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
