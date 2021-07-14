import { SourceDescription, SourceInterface } from "./Source";

export const TYPE = "googlesheet";

export class GoogleSheetSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("https://docs.google.com/spreadsheets") && getSpreadsheetID(uri) != null;
    }

    async getSource(): Promise<SourceInterface> {
        const module = await import("./GoogleSheetSource");
        return new module.GoogleSheetSource();
    }
}

export function getSpreadsheetID(uri: string): string | null {
    const regExp = /([\w-]){44}/;
    const result = uri.match(regExp);
    if (!result) return null;
    return result[0];
}
