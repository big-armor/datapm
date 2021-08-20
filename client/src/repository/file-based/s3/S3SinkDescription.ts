import { Sink, SinkDescription } from "../../Sink";
import { TYPE, DISPLAY_NAME } from "./S3RepositoryDescription";
export class S3SinkDescription implements SinkDescription {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async loadSinkFromModule(): Promise<Sink> {
        const module = await import("./S3Sink");
        return new module.S3Sink();
    }
}
