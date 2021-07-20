import { SourceDescription, Source } from "../../Source";
import { TYPE } from "./PostgresRepositoryDescription";

export class PostgresSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("postgres://");
    }

    async getSource(): Promise<Source> {
        const module = await import("./PostgresSource");
        return new module.PostgresSource();
    }
}
