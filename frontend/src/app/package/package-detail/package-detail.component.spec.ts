import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ApolloTestingModule, ApolloTestingController } from "apollo-angular/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ParamMap } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

import { PackageDetailComponent } from "./package-detail.component";
import { ActivatedRoute } from "@angular/router";

describe("PackageDetailComponent", () => {
    let component: PackageDetailComponent;
    let fixture: ComponentFixture<PackageDetailComponent>;
    let controller: ApolloTestingController;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageDetailComponent],
            imports: [RouterTestingModule, ApolloTestingModule, MatButtonModule, MatIconModule],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            parent: {
                                paramMap: {
                                    get: (name: string) => name
                                }
                            }
                        }
                    }
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageDetailComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
