import { TestBed } from "@angular/core/testing";

import { PackageResolverService } from "./package-resolver.service";

describe("PackageResolverService", () => {
    let service: PackageResolverService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(PackageResolverService);
    });

    it("should be created", () => {
        expect(service).toBeTruthy();
    });
});
