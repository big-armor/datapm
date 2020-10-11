import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'package',
  templateUrl: './package.component.html',
  styleUrls: ['./package.component.scss']
})
export class PackageComponent implements OnInit {

  public routes=[];
  public selectedTab = 0;

  constructor(
    private router: Router,
    private route: ActivatedRoute
    ) {
      let prefix = this.route.snapshot.params.catalogSlug + "/" + this.route.snapshot.params.packageSlug;
      this.routes = [
        {linkName:'details', url: prefix},
        {linkName:'schema', url:prefix + '/schema'},
        {linkName:'version', url:prefix +'/version'},
      ]
    }

  ngOnInit(): void {
    this.selectTab(0);
  }

  public selectTab(index) {
    this.router.navigate([this.routes[index].url]);
    this.selectedTab = index;
  }

}
