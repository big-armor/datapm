import { HttpClientModule } from "@angular/common/http";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ImageService } from "src/app/services/image.service";

import { CoverComponent } from "./cover.component";

describe("CoverComponent", () => {
    let component: CoverComponent;
    let fixture: ComponentFixture<CoverComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CoverComponent],
            imports: [HttpClientModule],
            providers: [ImageService]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CoverComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
