import { Sink, SinkDescription } from "../../Sink";
import { DISPLAY_NAME, TYPE } from "./KafkaConnectorDescription";

export class KafkaSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const description = await import("./KafkaSink");
        return new description.KafkaSink();
    }
}
