import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { MaterialModule } from "src/app/material.module";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import { DetailsComponent } from "./details.component";

describe("DetailsComponent", () => {
	let component: DetailsComponent;
	let fixture: ComponentFixture<DetailsComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [DetailsComponent],
			imports: [MaterialModule, RouterTestingModule, FormsModule, ReactiveFormsModule],
			providers: [
				{
					provide: MAT_DIALOG_DATA,
					useValue: {}
				},
				{
					provide: MatDialog,
					useValue: {}
				},
				{
					provide: MatDialogRef,
					useValue: {}
				}
			]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(DetailsComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
