import { Sink, SinkDescription } from "../../Sink";
import { TYPE, DISPLAY_NAME } from "./StandardOutRepositoryDescription";

export class StandardOutSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./StandardOutSink");
        return new module.StandardOutSinkModule();
    }
}
