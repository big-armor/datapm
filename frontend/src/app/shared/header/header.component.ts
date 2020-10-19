import { Component, OnInit, OnDestroy } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { FormControl, FormGroup } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

import { AuthenticationService } from "../../services/authentication.service";
import { LoginDialogComponent } from "./login-dialog/login-dialog.component";
import { SignUpDialogComponent } from "./sign-up-dialog/sign-up-dialog.component";
import { User } from "src/generated/graphql";

enum State {
	INIT,
	LOADING,
	ERROR,
	SUCCESS,
	ERROR_NOT_UNIQUE
}
@Component({
	selector: "sd-header",
	templateUrl: "./header.component.html",
	styleUrls: ["./header.component.scss"]
})
export class HeaderComponent implements OnInit, OnDestroy {
	state = State.INIT;

	currentUser: User;
	searchFormGroup: FormGroup;
	private subscription = new Subject();

	constructor(
		public dialog: MatDialog,
		private router: Router,
		private route: ActivatedRoute,
		private authenticationService: AuthenticationService
	) {}

	ngOnInit(): void {
		this.authenticationService
			.getUserObservable()
			.pipe(takeUntil(this.subscription))
			.subscribe((u) => {
				if (u == null) {
					return;
				}

				u.then((user) => {
					this.currentUser = user;
					this.state = State.SUCCESS;
				}).catch((error) => (this.state = State.ERROR));
			});

		this.searchFormGroup = new FormGroup({
			search: new FormControl("")
		});
	}

	ngOnDestroy(): void {
		this.subscription.unsubscribe();
	}

	openLoginDialog() {
		this.dialog.open(LoginDialogComponent, {
			disableClose: true
		});
	}

	openSignUpDialog() {
		this.dialog.open(SignUpDialogComponent, {
			disableClose: true
		});
	}

	goToSearch() {
		this.router.navigate(["/search"]);
	}

	search() {
		const query = this.searchFormGroup.value.search;
		this.router.navigate(["/search", { q: query }]);
	}

	goHome() {
		this.router.navigate(["/"]);
	}

	goToMyDetails() {
		this.router.navigate(["/me"]);
	}

	logout() {
		this.authenticationService.logout();
		setTimeout(() => (this.currentUser = null), 500);
	}
}
