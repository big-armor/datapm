import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterModule } from "@angular/router";
import { ApolloTestingModule } from "apollo-angular/testing";
import { FormsModule } from "@angular/forms";
import { MaterialModule } from "../material.module";
import { SearchComponent } from "./search.component";
import { TimeAgoPipe } from "../shared/pipes/time-ago.pipe";

describe("SearchComponent", () => {
    let component: SearchComponent;
    let fixture: ComponentFixture<SearchComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SearchComponent],
            imports: [RouterModule.forRoot([]), ApolloTestingModule, FormsModule, MaterialModule],
            providers: [TimeAgoPipe]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SearchComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
