import { Sink, SinkDescription } from "./SinkUtil";
export const DISPLAY_NAME = "AWS S3";
export const TYPE = "s3";

export class S3SinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./S3SinkModule");
        return new module.S3SinkModule();
    }
}
