import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlatformSettingsComponent } from './platform-settings.component';

describe('PlatformSettingsComponent', () => {
  let component: PlatformSettingsComponent;
  let fixture: ComponentFixture<PlatformSettingsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlatformSettingsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlatformSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
