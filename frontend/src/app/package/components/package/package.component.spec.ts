import { Component } from "@angular/core";
import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";

import { PackageComponent } from "./package.component";
import { VersionPipe } from "../../pipes/version.pipe";
import { SharedModule } from "../../../shared/shared.module";
import { PackageSizePipe } from "../../pipes/package-size.pipe";
import { ActivatedRoute } from "@angular/router";

@Component({
    template: ""
})
class DummyComponent {}

describe("PackageComponent", () => {
    let component: PackageComponent;
    let fixture: ComponentFixture<PackageComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [PackageComponent, VersionPipe, PackageSizePipe],
            imports: [
                RouterTestingModule.withRoutes([
                    {
                        path: ":catalogSlug/:packageSlug",
                        component: PackageComponent
                    }
                ]),
                ApolloTestingModule,
                SharedModule
            ],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: {
                                get: (key: string) => key
                            }
                        }
                    }
                }
            ]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(PackageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
