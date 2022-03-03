import { Sink, SinkDescription } from "../../Sink";
import { TYPE, DISPLAY_NAME } from "./MySqlConnectorDescription";

export class MySqlSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./MySqlSink");
        return new module.MySqlSink();
    }
}
