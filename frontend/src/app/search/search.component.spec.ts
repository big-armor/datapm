import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { RouterTestingModule } from "@angular/router/testing";
import { ApolloTestingModule } from "apollo-angular/testing";
import { MatRadioModule } from "@angular/material/radio";
import { MatListModule } from "@angular/material/list";
import { MatDividerModule } from "@angular/material/divider";
import { FormsModule } from "@angular/forms";
import { SharedModule } from "../shared/shared.module";
import { SearchComponent } from "./search.component";
import { TimeAgoPipe } from "../shared/pipes/time-ago.pipe";

describe("SearchComponent", () => {
    let component: SearchComponent;
    let fixture: ComponentFixture<SearchComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SearchComponent],
            imports: [
                RouterTestingModule,
                ApolloTestingModule,
                FormsModule,
                SharedModule,
                MatRadioModule,
                MatListModule,
                MatDividerModule
            ],
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
