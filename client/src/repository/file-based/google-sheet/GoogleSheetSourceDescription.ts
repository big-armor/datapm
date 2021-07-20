import { SourceDescription, Source } from "../../../repository/Source";
import { TYPE } from "./GoogleSheetRepositoryDescription";

export class GoogleSheetSourceDescription implements SourceDescription {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("https://docs.google.com/spreadsheets") && getSpreadsheetID(uri) != null;
    }

    async getSource(): Promise<Source> {
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
