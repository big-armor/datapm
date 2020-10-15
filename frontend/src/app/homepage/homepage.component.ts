import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'home',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss']
})
export class HomepageComponent implements OnInit {

  public routes=[
    // {linkName:'trending',url:'/trending'},
    {linkName:'latest',url:''},
    // {linkName:'following',url:'/following'},
    // {linkName:'premium',url:'/premium'},
  ]

  constructor() { }

  ngOnInit(): void {
  }

}
