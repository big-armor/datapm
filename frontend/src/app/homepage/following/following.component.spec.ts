import { async, ComponentFixture, TestBed } from "@angular/core/testing";

import { FollowingComponent } from "./following.component";

import { MaterialModule } from "../../material.module";

describe("FollowingComponent", () => {
	let component: FollowingComponent;
	let fixture: ComponentFixture<FollowingComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [FollowingComponent],
			imports: [MaterialModule]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(FollowingComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
