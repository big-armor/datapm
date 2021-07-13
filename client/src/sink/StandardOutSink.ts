import { Sink, SinkDescription } from "./SinkUtil";
export const DISPLAY_NAME = "Console (Standard Out)";
export const TYPE = "stdout";
export class StandardOutSinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./StandardOutSinkModule");
        return new module.StandardOutSinkModule();
    }
}
