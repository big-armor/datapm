import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandModalComponent } from './command-modal.component';

describe('CommandModalComponent', () => {
  let component: CommandModalComponent;
  let fixture: ComponentFixture<CommandModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CommandModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CommandModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
