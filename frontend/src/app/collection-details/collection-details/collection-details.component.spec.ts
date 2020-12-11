import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { ActivatedRoute } from "@angular/router";
import { Subject } from "rxjs";
import { SharedModule } from "../../shared/shared.module";

import { CollectionDetailsComponent } from "./collection-details.component";

describe("CollectionDetailsComponent", () => {
    let component: CollectionDetailsComponent;
    let fixture: ComponentFixture<CollectionDetailsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CollectionDetailsComponent],
            imports: [HttpClientModule, NoopAnimationsModule, MatProgressSpinnerModule, MatTabsModule, SharedModule],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: new Subject()
                    }
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CollectionDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
