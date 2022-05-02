import { Sink, SinkDescription } from "../Sink";
import { DISPLAY_NAME, TYPE } from "./TimeplusConnectorDescription";

export class TimeplusSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const source = await import("./TimeplusSink");
        return new source.TimeplusSink();
    }
}
