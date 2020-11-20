import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";

import { PackageInfoComponent } from "./package-info.component";

describe("PackageInfoComponent", () => {
    let component: PackageInfoComponent;
    let fixture: ComponentFixture<PackageInfoComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageInfoComponent],
            imports: [RouterTestingModule, NoopAnimationsModule, MatDialogModule, MatSnackBarModule, MatIconModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
