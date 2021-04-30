import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { EditPackageMarkdownComponent } from "./edit-package-markdown.component";

describe("EditMarkdownComponent", () => {
    let component: EditPackageMarkdownComponent;
    let fixture: ComponentFixture<EditPackageMarkdownComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [EditPackageMarkdownComponent]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(EditPackageMarkdownComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
