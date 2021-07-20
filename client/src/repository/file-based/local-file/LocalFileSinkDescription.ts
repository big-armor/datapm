import { Sink, SinkDescription } from "../../Sink";
import { DISPLAY_NAME, TYPE } from "./LocalFileRepositoryDescription";

export class LocalFileSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./LocalFileSink");
        return new module.LocalFileSink();
    }
}
