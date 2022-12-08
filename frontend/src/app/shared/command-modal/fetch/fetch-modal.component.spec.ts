import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { FetchModalComponent } from './fetch-modal.component';

describe('FetchModalComponent', () => {
  let component: FetchModalComponent;
  let fixture: ComponentFixture<FetchModalComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ FetchModalComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FetchModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
