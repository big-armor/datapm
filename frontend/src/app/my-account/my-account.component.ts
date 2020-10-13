import { Component, OnInit, ChangeDetectorRef } from "@angular/core";
import { AuthenticationService } from "../services/authentication.service";
import { ActivatedRoute, Router } from "@angular/router";
import { FormGroup, FormControl } from "@angular/forms";
import { getRegistryPort, getRegistryProtocol, getRegistryHostname } from "../helpers/RegistryAccessHelper";
import {
	APIKey,
	Catalog,
	CreateAPIKeyGQL,
	DeleteAPIKeyGQL,
	MyAPIKeysGQL,
	MyCatalogsGQL,
	Scope,
	User
} from "src/generated/graphql";
import { EditAccountDialogComponent } from "./edit-account-dialog/edit-account-dialog.component";
import { MatDialog } from "@angular/material/dialog";

enum State {
	INIT,
	LOADING,
	ERROR,
	SUCCESS,
	ERROR_NOT_UNIQUE
}
@Component({
	selector: "app-my-account",
	templateUrl: "./my-account.component.html",
	styleUrls: ["./my-account.component.scss"]
})
export class MyAccountComponent implements OnInit {
	State = State;
	state = State.INIT;

	catalogState = State.INIT;
	apiKeysState = State.INIT;
	createAPIKeyState = State.INIT;
	deleteAPIKeyState = State.INIT;

	currentUser: User;

	newAPIKey: string;

	public myCatalogs: Catalog[];
	public myAPIKeys: APIKey[];
	public routes = [];
	public selectedTab = 0;

	createAPIKeyForm: FormGroup;

	constructor(
		private authenticationService: AuthenticationService,
		private router: Router,
		private myCatalogsGQL: MyCatalogsGQL,
		private createAPIKeyGQL: CreateAPIKeyGQL,
		private myAPIKeysGQL: MyAPIKeysGQL,
		private deleteAPIKeyGQL: DeleteAPIKeyGQL,
		private changeDectorRef: ChangeDetectorRef,
		private route: ActivatedRoute,
		public dialog: MatDialog
	) {
		let prefix = "/me";
		this.routes = [
			{ linkName: "details", url: prefix },
			{ linkName: "packages", url: prefix + "/packages" },
			{ linkName: "activity", url: prefix + "/activity" }
		];
	}

	ngOnInit(): void {
		this.selectTab(0);
		this.state = State.INIT;

		this.createAPIKeyForm = new FormGroup({
			label: new FormControl("")
		});

		this.authenticationService.getUserObservable().subscribe((u) => {
			if (u == null) {
				return;
			}

			u.then((user) => {
				this.currentUser = user;
				this.state = State.SUCCESS;
			}).catch((error) => (this.state = State.ERROR));
		});

		this.myCatalogsGQL.fetch().subscribe((response) => {
			if (response.errors?.length > 0) {
				this.catalogState = State.ERROR;
				return;
			}

			this.myCatalogs = response.data.myCatalogs;
			this.catalogState = State.SUCCESS;
		});

		this.refreshAPIKeys();
	}

	openEditDialog() {
		this.dialog.open(EditAccountDialogComponent);
	}

	public selectTab(index) {
		this.router.navigate([this.routes[index].url]);
		this.selectedTab = index;
	}

	refreshAPIKeys() {
		this.apiKeysState = State.LOADING;

		this.myAPIKeysGQL.fetch({}, { fetchPolicy: "no-cache" }).subscribe((response) => {
			if (response.errors?.length > 0) {
				this.apiKeysState = State.ERROR;
				return;
			}
			this.myAPIKeys = response.data.myAPIKeys;
			this.apiKeysState = State.SUCCESS;
		});
	}

	createAPIKey() {
		this.createAPIKeyGQL
			.mutate({
				value: {
					label: this.createAPIKeyForm.value.label,
					scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
				}
			})
			.subscribe((response) => {
				if (response.errors?.length > 0) {
					if (response.errors.find((e) => e.message == "NOT_UNIQUE")) {
						this.createAPIKeyState = State.ERROR_NOT_UNIQUE;
						return;
					}

					this.createAPIKeyState = State.ERROR;
					return;
				}

				const key = response.data.createAPIKey;

				this.newAPIKey = btoa(key.id + "." + key.secret);

				this.createAPIKeyForm.get("label").setValue("");
				this.refreshAPIKeys();
				this.createAPIKeyState = State.SUCCESS;
			});
	}

	deleteApiKey(id: string) {
		this.deleteAPIKeyState = State.LOADING;

		this.deleteAPIKeyGQL.mutate({ id: id }).subscribe((response) => {
			if (response.errors?.length > 0) {
				this.deleteAPIKeyState = State.ERROR;
				return;
			}

			this.createAPIKeyForm.get("label").setValue("");
			this.refreshAPIKeys();
			this.deleteAPIKeyState = State.SUCCESS;
		});
	}

	logoutClicked() {
		this.authenticationService.logout();
		this.router.navigate(["/"]);
	}

	apiKeyCommandString() {
		const hostname = getRegistryHostname();
		const protocol = getRegistryProtocol();
		const port = getRegistryPort();
		let protocolOption = "";
		let portOption = "";

		if (protocol == "https" && port != 443) {
			portOption = "--port " + port;
		} else if (protocol == "http" && port != 80) {
			portOption = " --port " + port;
		}

		if (protocol == "http") {
			protocolOption = " --protocol " + protocol;
		}

		return `datapm registry add ${hostname}` + portOption + protocolOption + ` ${this.newAPIKey}`;
	}
}
