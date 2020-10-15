import { Component, OnDestroy, OnInit } from "@angular/core";
import { FormGroup, FormControl } from "@angular/forms";
import { Router } from "@angular/router";
import { takeUntil } from "rxjs/operators";
import { Subject } from "rxjs";

import { AuthenticationService } from "./services/authentication.service";
import { User } from "../generated/graphql";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit, OnDestroy {
	public title = "datapm-registry-frontend";

	currentUser: User;
	searchFormGroup: FormGroup;

	private subscription = new Subject();

	constructor(private authenticationService: AuthenticationService, public router: Router) {}

	ngOnInit() {
		let currentPromise: Promise<User>;

		this.searchFormGroup = new FormGroup({
			search: new FormControl("")
		});

		this.authenticationService
			.getUserObservable()
			.pipe(takeUntil(this.subscription))
			.subscribe((userPromise) => {
				currentPromise = userPromise;

				if (userPromise == null) {
					this.currentUser = null;
					return;
				}

				userPromise
					.then((user) => {
						// Race condition consideration
						if (currentPromise != userPromise) return;

						this.currentUser = user;
					})
					.catch((error) => {
						// nothing to do
					});
			});
	}

	ngOnDestroy() {
		this.subscription.unsubscribe();
	}

	getWelcomeString() {
		if (this.currentUser.firstName != null) return this.currentUser.firstName;

		return this.currentUser.username;
	}

	search() {
		const query = this.searchFormGroup.value.search;

		this.router.navigate(["/search", { q: query }]);
	}
}
