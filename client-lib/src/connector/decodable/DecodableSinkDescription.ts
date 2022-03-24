import { Sink, SinkDescription } from "../Sink";
import { DISPLAY_NAME, TYPE } from "./DecodableConnectorDescription";

export class DecodableSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const source = await import("./DecodableSink");
        return new source.DecodableSink();
    }
}
