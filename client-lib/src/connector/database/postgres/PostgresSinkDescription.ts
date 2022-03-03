import { DISPLAY_NAME, TYPE } from "./PostgresConnectorDescription";
import { Sink, SinkDescription } from "../../Sink";

export class PostgresSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./PostgresSink");
        return new module.PostgresSink();
    }
}
