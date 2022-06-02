import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DownloadsComponent } from './downloads.component';
import { DownloadsRoutingModule } from "./downloads-routing.module"


@NgModule({
  declarations: [DownloadsComponent],
  imports: [
    CommonModule,
    DownloadsRoutingModule
  ]
})
export class DownloadsModule { 

}
