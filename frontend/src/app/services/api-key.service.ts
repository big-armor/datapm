import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import { APIKey, MyAPIKeysGQL } from "../../generated/graphql";
import { CapabilitiesServiceImpl } from "./capabilities-impl.service";

@Injectable({
    providedIn: "root"
})
export class ApiKeyService {
    private apiKeys = new BehaviorSubject<APIKey[]>(null);

    constructor(public myAPIKeysGQL: MyAPIKeysGQL, private cap: CapabilitiesServiceImpl) {}

    public getMyApiKeys(reload?: boolean): Observable<APIKey[]> {
        if (reload || this.apiKeys.value == null) {
            this.apiKeys.next(null);
            this.loadApiKeys();
        }

        return this.apiKeys;
    }

    private loadApiKeys(): void {
        this.myAPIKeysGQL.fetch({}, { fetchPolicy: "no-cache" }).subscribe(
            (result) => {
                if (result.error || result.errors) {
                    this.apiKeys.error(result);
                    return;
                }

                const apiKeys = result.data.myAPIKeys;
                this.apiKeys.next(apiKeys);
            },
            (error) => this.apiKeys.error(error)
        );
    }
}
