import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatExpansionModule } from "@angular/material/expansion";
import { PackageSchemaComponent } from "./package-schema.component";

describe("PackageSchemaComponent", () => {
    let component: PackageSchemaComponent;
    let fixture: ComponentFixture<PackageSchemaComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageSchemaComponent],
            imports: [MatExpansionModule, NoopAnimationsModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageSchemaComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
