import { Component, OnInit } from '@angular/core';
import { DATAPM_VERSION } from 'datapm-lib';

@Component({
  selector: 'app-downloads',
  templateUrl: './downloads.component.html',
  styleUrls: ['./downloads.component.scss']
})
export class DownloadsComponent implements OnInit {

  public version = DATAPM_VERSION;

  constructor() { 
    console.log("testing")
  }

  ngOnInit(): void {
  }

}
