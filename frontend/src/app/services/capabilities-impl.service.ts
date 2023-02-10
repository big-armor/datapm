import { Injectable } from "@angular/core";
import { ConnectorDescription, ListConnectorsGQL } from "src/generated/graphql";

@Injectable({
    providedIn: "root"
})
export class CapabilitiesService {

    private connectors: ConnectorDescription[];

    constructor(
        private listConnectorsGQL: ListConnectorsGQL
    ) {
        
    }

    public async listConnectors(): Promise<ConnectorDescription[]> {
        if(!this.connectors) {
            const response = await this.listConnectorsGQL.fetch().toPromise();

            if(response.errors) {
                console.error("Error listing connectors", response.errors);
                throw new Error(response.errors[0].message);
            }

            this.connectors = response.data.listConnectors;
        }

        return this.connectors;
    }
}
