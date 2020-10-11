import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'following',
  templateUrl: './following.component.html',
  styleUrls: ['./following.component.scss']
})
export class FollowingComponent implements OnInit {

  public isFavorite = false;

  constructor() { }

  ngOnInit(): void {
  }

  public makeFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }

}
