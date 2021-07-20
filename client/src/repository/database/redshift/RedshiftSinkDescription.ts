import { Sink, SinkDescription } from "../../Sink";
import { TYPE, DISPLAY_NAME } from "./RedshiftRepositoryDescription";
export class RedshiftSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./RedshiftSink");
        return new module.RedshiftSink();
    }
}
