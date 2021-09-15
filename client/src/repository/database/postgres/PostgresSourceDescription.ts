import { SourceDescription, Source } from "../../Source";
import { TYPE, DISPLAY_NAME } from "./PostgresRepositoryDescription";

export class PostgresSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("postgres://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./PostgresSource");
        return new module.PostgresSource();
    }
}
