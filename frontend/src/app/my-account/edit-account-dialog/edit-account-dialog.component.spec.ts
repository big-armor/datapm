import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditAccountDialogComponent } from './edit-account-dialog.component';

describe('EditAccountDialogComponent', () => {
  let component: EditAccountDialogComponent;
  let fixture: ComponentFixture<EditAccountDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditAccountDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditAccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
