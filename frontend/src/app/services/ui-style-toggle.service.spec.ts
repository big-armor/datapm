import { TestBed } from "@angular/core/testing";

import { UiStyleToggleService } from "./ui-style-toggle.service";

describe("UiStyleToggleService", () => {
    let service: UiStyleToggleService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(UiStyleToggleService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
