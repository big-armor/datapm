import { Component, Input, OnInit } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { AddPackageComponent } from "src/app/collection-details/add-package/add-package.component";
import { Package, UserPackagesGQL } from "src/generated/graphql";

enum State {
    INIT,
    LOADING,
    SUCCESS,
    ERROR
}
@Component({
    selector: "app-user-packages",
    templateUrl: "./user-packages.component.html",
    styleUrls: ["./user-packages.component.scss"]
})
export class UserPackagesComponent implements OnInit {
    @Input() username: string;
    @Input() isCurrentUser: boolean;

    State = State;
    state = State.INIT;
    public packages: Package[];

    constructor(private userPackages: UserPackagesGQL, private dialog: MatDialog) {}

    ngOnInit(): void {
        this.refreshPackages();
    }

    refreshPackages() {
        this.state = State.LOADING;
        this.userPackages.fetch({ username: this.username, offSet: 0, limit: 1000 }).subscribe((response) => {
            if (response.errors?.length > 0) {
                this.state = State.ERROR;
                return;
            }
            this.packages = response.data.userPackages.packages as Package[];
            this.state = State.SUCCESS;
        });
    }

    addToCollection(packageObject: Package) {
        const dialogRef = this.dialog.open(AddPackageComponent, {
            data: {
                packageIdentifier: packageObject.identifier
            },
            width: "600px"
        });
    }
}
