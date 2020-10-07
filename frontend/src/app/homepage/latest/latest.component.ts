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
    this.latestPackages.fetch({offset: 0, limit: 5}).subscribe((a) => {
      const dateNow = new Date();
      this.packagesWithModifiedDate = a.data.latestPackages.packages.map((p) => {
        const changeDates = this.getLastChangedDates(p);
        return {
          package: p,
          lastActivityLabel: this.getUpdatedDateLabel(new Date(changeDates.createdAt), new Date(changeDates.updatedAt), dateNow)
        }
      });
    });
  }

  private getLastChangedDates(pkg: any): { createdAt: Date, updatedAt: Date} {
    if (pkg.latestVersion != null) {
      return {
        createdAt: pkg.latestVersion.createdAt,
        updatedAt: pkg.latestVersion.updatedAt
      }
    } else {
        return {
          createdAt: pkg.createdAt,
          updatedAt: pkg.updatedAt
        }
    }
  }

  private getUpdatedDateLabel(createdAtDate: Date, updatedAtDate: Date, dateNow: Date): string {
    let actionLabel;
    if (createdAtDate.getTime() == updatedAtDate.getTime()) {
      actionLabel = "Created ";
    } else {
      actionLabel = "Updated ";
    }

    const differenceLabel = getTimeDifferenceLabel(updatedAtDate, dateNow);
    return actionLabel + differenceLabel;
  }
}
