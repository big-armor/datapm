import { SourceDescription, SourceInterface } from "./Source";
export const TYPE = "postgres";

export class PostgresSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("postgres://");
    }

    async getSource(): Promise<SourceInterface> {
        const module = await import("./PostgresSource");
        return new module.PostgresSource();
    }
}
