import { Sink, SinkDescription } from "../../Sink";

import { TYPE, DISPLAY_NAME } from "./MongoConnectorDescription";

export class MongoSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./MongoSink");
        return new module.MongoSinkModule();
    }
}
