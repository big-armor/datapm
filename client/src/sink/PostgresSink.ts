import { Sink, SinkDescription } from "./Sink";
export const DISPLAY_NAME = "PostgreSQL";
export const TYPE = "postgres";

export class PostgresSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./PostgresSinkModule");
        return new module.PostgresSinkModule();
    }
}
