import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { MaterialModule } from "src/app/material.module";

import { PackageSchemaComponent } from "./package-schema.component";
import { ApolloTestingModule } from "apollo-angular/testing";
import { RouterTestingModule } from "@angular/router/testing";

describe("PackageSchemaComponent", () => {
	let component: PackageSchemaComponent;
	let fixture: ComponentFixture<PackageSchemaComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [PackageSchemaComponent],
			imports: [RouterTestingModule, ApolloTestingModule, MaterialModule]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(PackageSchemaComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
