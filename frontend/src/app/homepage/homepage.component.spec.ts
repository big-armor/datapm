import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { HomepageComponent } from "./homepage.component";
import { AppModule } from "./../app.module";
import { MaterialModule } from "../material.module";

describe("HomepageComponent", () => {
	let component: HomepageComponent;
	let fixture: ComponentFixture<HomepageComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [AppModule, MaterialModule],
			declarations: [HomepageComponent]
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(HomepageComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it("should create", () => {
		expect(component).toBeTruthy();
	});
});
