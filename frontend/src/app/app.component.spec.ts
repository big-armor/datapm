import { TestBed, async } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { HomepageComponent } from './homepage/homepage.component';
import { LatestComponent } from './homepage/latest/latest.component';
import { MaterialModule } from './material.module';
import { DetailsComponent } from './my-account/details/details.component';
import { MyAccountComponent } from './my-account/my-account.component';
import { SharedModule } from './shared/shared.module';

describe('AppComponent', () => {

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([
          {
            path: '',
            component: HomepageComponent,
            children: [
              {
                path: 'latest',
                component: LatestComponent
              },
            ]
          },
          {
            path : 'me',
            component: MyAccountComponent,
            children: [
              {
                path: 'details',
                redirectTo: "",
                pathMatch: "full"
              },
              {
                path: "",
                component: DetailsComponent
              },
            ]},
        ]),
        MaterialModule,
        ReactiveFormsModule,
        SharedModule
      ],
      declarations: [
        AppComponent
      ],
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'datapm-registry-frontend'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('datapm-registry-frontend');
  });

  // it('should render title', () => {
  //   const fixture = TestBed.createComponent(AppComponent);
  //   fixture.detectChanges();
  //   const compiled = fixture.nativeElement;
  //   expect(compiled.querySelector('.title').textContent).toContain('datapm');
  // });
});
