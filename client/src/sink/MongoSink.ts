import { Sink, SinkDescription } from "./Sink";

export const DISPLAY_NAME = "MongoDB";
export const TYPE = "mongo";

export class MongoSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./MongoSinkModule");
        return new module.MongoSinkModule();
    }
}
