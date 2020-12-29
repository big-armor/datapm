import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpClientModule } from "@angular/common/http";
import { NoopAnimationsModule } from "@angular/platform-browser/animations";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MatDialogModule } from "@angular/material/dialog";
import { MatTabsModule } from "@angular/material/tabs";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

import { CatalogDetailsComponent } from "./catalog-details.component";
import { SharedModule } from "../../shared/shared.module";

describe("CatalogDetailsComponent", () => {
    let component: CatalogDetailsComponent;
    let fixture: ComponentFixture<CatalogDetailsComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [CatalogDetailsComponent],
            imports: [
                RouterTestingModule,
                ApolloTestingModule,
                HttpClientModule,
                NoopAnimationsModule,
                MatDialogModule,
                MatTabsModule,
                MatProgressSpinnerModule,
                SharedModule
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(CatalogDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
