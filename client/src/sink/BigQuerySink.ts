import { Sink, SinkDescription } from "./Sink";

export const DISPLAY_NAME = "Big Query";
export const TYPE = "big-query";

export class BigQuerySinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./BigQuerySinkModule");
        return new module.BigQuerySinkModule();
    }
}
