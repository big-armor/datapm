import { Sink, SinkDescription } from "../../Sink";
import { TYPE, DISPLAY_NAME } from "./DataPMRepositoryDescription";
export class DataPMSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./DataPMSink");
        return new module.DataPMSink();
    }
}
