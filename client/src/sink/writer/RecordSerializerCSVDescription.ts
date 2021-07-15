import { DPMRecordSerializer, DPMRecordSerializerDescription } from "./RecordSerializer";
export const DISPLAY_NAME = "CSV (Comma Separated Values)";
export const MIME_TYPE = "text/csv";
export const EXTENSION = "csv";

export class RecordSerializerCSVDescription implements DPMRecordSerializerDescription {
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    getOutputMimeType(): string {
        return MIME_TYPE;
    }

    getFileExtension(): string {
        return EXTENSION;
    }

    async getRecordSerializer(): Promise<DPMRecordSerializer> {
        const module = await import("./RecordSerializerCSV");
        return new module.RecordSerializerCSV();
    }
}
