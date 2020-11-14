import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { ImageService } from "src/app/services/image.service";
import { AvatarComponent } from "./avatar.component";
import { User } from "src/generated/graphql";

describe("AvatarComponent", () => {
    let component: AvatarComponent;
    let fixture: ComponentFixture<AvatarComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [AvatarComponent],
            imports: [HttpClientModule],
            providers: [ImageService]
        }).compileComponents();

        fixture = TestBed.createComponent(AvatarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }));

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
