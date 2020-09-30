import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'home',
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.scss']
})
export class HomepageComponent implements OnInit {

  constructor() { }

  // public routes=[
  //   {linkName:'trending',url:'/home/',label:"trending"},
  //   {linkName:'latest',url:'/home/latest',label:"latest"},
  //   {linkName:'following',url:'/home/following',label:"following"},
  //   {linkName:'premium',url:'/home/premium',label:"premium"},
  // ]

  ngOnInit(): void {
  }

}
