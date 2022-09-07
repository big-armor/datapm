import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PackageAutocompleteComponent } from './package-autocomplete.component';

describe('PackageAutocompleteComponent', () => {
  let component: PackageAutocompleteComponent;
  let fixture: ComponentFixture<PackageAutocompleteComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PackageAutocompleteComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PackageAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
