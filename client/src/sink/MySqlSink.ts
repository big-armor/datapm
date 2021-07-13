import { Sink, SinkDescription } from "./SinkUtil";
export const DISPLAY_NAME = "MySQL";
export const TYPE = "mysql";
export class MySqlSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./MySqlSinkModule");
        return new module.MySqlSinkModule();
    }
}
