import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MaterialModule } from "src/app/material.module";

import { EditAccountDialogComponent } from "./edit-account-dialog.component";

describe("EditAccountDialogComponent", () => {
	let component: EditAccountDialogComponent;
	let fixture: ComponentFixture<EditAccountDialogComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [EditAccountDialogComponent],
			imports: [MaterialModule, RouterTestingModule]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(EditAccountDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
