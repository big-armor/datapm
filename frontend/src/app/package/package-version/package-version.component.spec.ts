import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MaterialModule } from "src/app/material.module";

import { PackageVersionComponent } from "./package-version.component";

describe("PackageVersionComponent", () => {
	let component: PackageVersionComponent;
	let fixture: ComponentFixture<PackageVersionComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [PackageVersionComponent],
			imports: [RouterTestingModule, ApolloTestingModule, MaterialModule]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(PackageVersionComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
