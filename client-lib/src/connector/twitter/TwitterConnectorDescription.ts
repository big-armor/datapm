import { Connector, ConnectorDescription } from "../Connector";
import { SinkDescription } from "../Sink";
import { SourceDescription } from "../Source";

export const DISPLAY_NAME = "Twitter";
export const TYPE = "twitter";

export class TwitterConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const connectorDescription = await import("./TwitterConnector");
        return new connectorDescription.TwitterConnector();
    }

    async getSourceDescription(): Promise<SourceDescription | null> {
        const sourceDescription = await import("./TwitterSourceDescription");
        return new sourceDescription.TwitterSourceDescription();
    }

    getSinkDescription(): Promise<SinkDescription | null> {
        throw new Error("Method not implemented.");
    }

    hasSource(): boolean {
        return true;
    }

    hasSink(): boolean {
        return false;
    }
}
