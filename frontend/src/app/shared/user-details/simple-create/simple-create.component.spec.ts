import { async, ComponentFixture, TestBed } from "@angular/core/testing";
import { ReactiveFormsModule } from "@angular/forms";

import { SimpleCreateComponent } from "./simple-create.component";
import { InputComponent } from "../../input/input.component";
import { InputErrorPipe } from "../../pipes/input-error.pipe";

describe("SimpleCreateComponent", () => {
    let component: SimpleCreateComponent;
    let fixture: ComponentFixture<SimpleCreateComponent>;

    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SimpleCreateComponent, InputComponent, InputErrorPipe],
            imports: [ReactiveFormsModule]
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(SimpleCreateComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it("should create", () => {
        expect(component).toBeTruthy();
    });
});
