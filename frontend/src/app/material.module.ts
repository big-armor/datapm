import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {MatRadioModule} from '@angular/material/radio';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatTabsModule} from '@angular/material/tabs';
import {MatMenuModule} from '@angular/material/menu';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatSelectModule} from '@angular/material/select';
import {MatDialogModule} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatStepperModule} from '@angular/material/stepper';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatListModule} from '@angular/material/list';
import {MatDividerModule} from '@angular/material/divider';
import {MatExpansionModule} from '@angular/material/expansion';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    BrowserAnimationsModule,
    MatRadioModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatMenuModule,
    MatSidenavModule,
    MatCardModule,
    MatChipsModule,
    MatSelectModule,
    MatDialogModule,
    MatInputModule,
    MatStepperModule,
    MatCheckboxModule,
    MatListModule,
    MatDividerModule,
    MatExpansionModule
  ],
  exports: [
    MatRadioModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatMenuModule,
    MatSidenavModule,
    MatCardModule,
    MatChipsModule,
    MatSelectModule,
    MatDialogModule,
    MatInputModule,
    MatStepperModule,
    MatCheckboxModule,
    MatListModule,
    MatDividerModule,
    MatExpansionModule
  ]
})
export class MaterialModule { }
