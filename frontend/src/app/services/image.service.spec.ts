import { TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";

import { ImageService } from "./image.service";

describe("ImageService", () => {
    let service: ImageService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientModule]
        });
        service = TestBed.inject(ImageService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
