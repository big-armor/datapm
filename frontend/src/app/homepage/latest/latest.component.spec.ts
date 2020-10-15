import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MaterialModule } from "src/app/material.module";

import { LatestComponent } from "./latest.component";

describe("LatestComponent", () => {
	let component: LatestComponent;
	let fixture: ComponentFixture<LatestComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [LatestComponent],
			imports: [ApolloTestingModule, MaterialModule]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(LatestComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
