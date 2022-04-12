import { Connector, ConnectorDescription } from "../../Connector";
import { SinkDescription } from "../../Sink";
import { SourceDescription } from "../../Source";

export const DISPLAY_NAME = "Kafka";
export const TYPE = "kafka";

export class KafkaConnectorDescription implements ConnectorDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getType(): string {
        return TYPE;
    }

    async getConnector(): Promise<Connector> {
        const description = await import("./KafkaConnector");
        return new description.KafkaConnector();
    }

    getSourceDescription(): Promise<SourceDescription | null> {
        throw new Error("Method not implemented.");
    }

    async getSinkDescription(): Promise<SinkDescription | null> {
        const sinkDescription = await import("./KafkaSinkDescription");
        return new sinkDescription.KafkaSinkDescription();
    }

    hasSource(): boolean {
        return false;
    }

    hasSink(): boolean {
        return true;
    }
}
