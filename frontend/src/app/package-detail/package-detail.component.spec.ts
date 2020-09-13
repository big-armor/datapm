import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PackageDetailComponent } from './package-detail.component';
import { RouterModule } from '@angular/router';
import {
  ApolloTestingModule,
  ApolloTestingController,
} from 'apollo-angular/testing';

describe('PackageDetailComponent', () => {
  let component: PackageDetailComponent;
  let fixture: ComponentFixture<PackageDetailComponent>;
  let controller: ApolloTestingController;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PackageDetailComponent ],
      imports: [RouterModule.forRoot([]),ApolloTestingModule]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PackageDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
