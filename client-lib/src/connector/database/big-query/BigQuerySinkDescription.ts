import { Sink, SinkDescription } from "../../Sink";
import { DISPLAY_NAME, TYPE } from "./BigQueryConnectorDescription";

export class BigQuerySinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./BigQuerySink");
        return new module.BigQuerySink();
    }
}
