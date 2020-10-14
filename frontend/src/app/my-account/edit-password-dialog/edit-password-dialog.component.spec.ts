import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPasswordDialogComponent } from './edit-password-dialog.component';

describe('EditPasswordDialogComponent', () => {
  let component: EditPasswordDialogComponent;
  let fixture: ComponentFixture<EditPasswordDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ EditPasswordDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditPasswordDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
