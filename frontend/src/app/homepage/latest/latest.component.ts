import { Component, OnInit } from '@angular/core';
import { GetLatestPackagesGQL, MeGQL, Package } from 'src/generated/graphql';
import { getTimeDifferenceLabel } from 'src/app/helpers/TimeUtil';

class PackageWithModifiedDate {
  package: any;
  lastActivityLabel: string;
}

@Component({
  selector: 'latest',
  templateUrl: './latest.component.html',
  styleUrls: ['./latest.component.scss']
})
export class LatestComponent implements OnInit {

  public isFavorite = false;
  public packagesWithModifiedDate: PackageWithModifiedDate[] = [];

  constructor(private latestPackages: GetLatestPackagesGQL) { }

  public ngOnInit(): void {
    this.loadLatestPackages();
  }

  public makeFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }

  private loadLatestPackages(): void {
    this.latestPackages.fetch({limit: 5, offset: 0}).subscribe((a) => {
      const dateNow = new Date();
      this.packagesWithModifiedDate = a.data.latestPackages.packages.map((p) => {
        return {
          package: p,
          lastActivityLabel: this.getUpdatedDateLabel(new Date(p.createdAt), new Date(p.updatedAt), dateNow)
        }
      });
    });
  }

  private getUpdatedDateLabel(createdAtDate: Date, updatedAtDate: Date, dateNow: Date): string {
    let actionLabel;
    if (createdAtDate == updatedAtDate) {
      actionLabel = "Created";
    } else {
      actionLabel = "Updated";
    }

    const differenceLabel = getTimeDifferenceLabel(updatedAtDate, dateNow);
    return actionLabel + differenceLabel;
  }
}
